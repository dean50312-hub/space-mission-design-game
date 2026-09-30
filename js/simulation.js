// 任務模擬：依任務模型的機率擲骰決定結果，再播放火箭飛行動畫（視角固定、背景捲動）

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sampleExponential(rate) {
  if (rate <= 0) return Infinity;
  return -Math.log(1 - Math.random()) / rate;
}

function pickWeighted(weights) {
  const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
  let roll = Math.random() * total;
  for (const [key, w] of Object.entries(weights)) {
    roll -= w;
    if (roll <= 0) return key;
  }
  return Object.keys(weights)[0];
}

// 依任務模型的機率決定整趟任務的結果；各階段的機率和選件畫面顯示的數字完全一致
function rollMissionOutcome(analysis, design) {
  const rel = analysis.reliability;
  const fail = (stageId, cause, extra = {}) => ({ failedStageId: stageId, cause, serviceYears: 0, ...extra });

  const rocketFailure = 1 - rel.rocket;
  const liftoffFailure = rocketFailure * LIFTOFF_SHARE_OF_LAUNCH_FAILURE;
  if (Math.random() < liftoffFailure) return fail("liftoff", "launch_vehicle");

  const ascentRocketPass = (1 - rocketFailure) / (1 - liftoffFailure);
  if (Math.random() > ascentRocketPass) return fail("ascent", "launch_vehicle");
  if (Math.random() > design.parts.structure.launchSurvival) return fail("ascent", "launch_loads");

  if (analysis.stranded) return fail("insertion", "insufficient_dv");

  const failureTime = sampleExponential(rel.hazardPerYear);
  if (failureTime < rel.beltYears) return fail("insertion", "radiation_belts");

  const deployables = [];
  for (let i = 0; i < design.parts.power.deployables; i++) deployables.push("array");
  for (let i = 0; i < design.parts.comm.deployables; i++) deployables.push("antenna");
  for (const mechanism of deployables) {
    if (Math.random() > DEPLOY_MECHANISM_RELIABILITY) return fail("deployment", "deployment_" + mechanism);
  }

  let serviceYears = rel.lifeYears;
  let cause = null;

  const componentFailureYears = failureTime - rel.beltYears;
  if (componentFailureYears < serviceYears) {
    serviceYears = componentFailureYears;
    cause = "component_" + pickWeighted(rel.hazardBreakdown);
  }
  if (Math.random() < rel.impactRisk) {
    const impactYears = Math.random() * rel.lifeYears;
    if (impactYears < serviceYears) {
      serviceYears = impactYears;
      cause = "impact";
    }
  }

  return { failedStageId: cause ? "operation" : null, cause, serviceYears };
}

function deliveredValueFor(analysis, design, serviceYears) {
  return (analysis.coreValue * analysis.delayFactor * serviceYears) / design.orbit.designLifeYears;
}

async function runSimulation() {
  const design = currentDesign();
  const analysis = analyzeDesign(design);
  const outcome = rollMissionOutcome(analysis, design);

  let stageReachedIndex = -1;
  for (let i = 0; i < STAGES.length; i++) {
    const stage = STAGES[i];
    await animateStageAttempt(stage, i, design, analysis);
    stageReachedIndex = i;

    if (stage.id === "operation") {
      await animateOperationYears(design, analysis, outcome);
    }

    const passed = outcome.failedStageId !== stage.id;
    await animateStageResolve(stage, i, passed);
    if (!passed) break;
  }

  const overallSuccess = outcome.failedStageId === null;
  return {
    design,
    analysis,
    overallSuccess,
    stageReachedIndex,
    failedStage: overallSuccess ? null : STAGES.find((s) => s.id === outcome.failedStageId),
    cause: outcome.cause,
    serviceYears: outcome.serviceYears,
    deliveredValue: deliveredValueFor(analysis, design, outcome.serviceYears),
    propellantDepleted: overallSuccess && analysis.dvLifeFactor < 1,
  };
}

// ---------- 飛行動畫：視角固定在畫面中心，背景場景（地面→雲層→大氣層→太空）往下捲動 ----------

const FLIGHT_START_PERCENT = 4;

function sceneTopForPercent(percent) {
  const scene = document.getElementById("flight-scene");
  const track = document.getElementById("flight-track");
  return -(scene.offsetHeight - track.offsetHeight) * (1 - percent / 100);
}

function setSceneProgress(percent, durationMs) {
  const scene = document.getElementById("flight-scene");
  scene.style.transition = `top ${durationMs}ms ease-in-out`;
  scene.style.top = `${sceneTopForPercent(percent)}px`;
  return sleep(durationMs);
}

function setRocketFlying(on) {
  document.getElementById("rocket").classList.toggle("flying", on);
  document.getElementById("exhaust").classList.toggle("active", on);
}

function setRocketExploding(on) {
  const rocket = document.getElementById("rocket");
  rocket.classList.toggle("exploding", on);
  rocket.textContent = on ? "💥" : "🚀";
}

function resetFlightView() {
  const scene = document.getElementById("flight-scene");
  scene.style.transition = "none";
  scene.style.top = `${sceneTopForPercent(FLIGHT_START_PERCENT)}px`;
  void scene.offsetHeight; // 強制 reflow，確保下一次移動會套用 transition

  setRocketFlying(false);
  setRocketExploding(false);
  scene.style.transition = "";

  document.getElementById("simulation-log").textContent = "";

  const dotsWrap = document.getElementById("stage-dots");
  dotsWrap.innerHTML = "";
  STAGES.forEach((stage, i) => {
    const dot = document.createElement("span");
    dot.className = "stage-dot";
    dot.id = `stage-dot-${i}`;
    dot.title = t("stage." + stage.id);
    dotsWrap.appendChild(dot);
  });
}

function setDotState(index, state) {
  const dot = document.getElementById(`stage-dot-${index}`);
  dot.classList.remove("active", "pass", "fail", "skipped");
  dot.classList.add(state);
}

function markRemainingDotsSkipped(failedIndex) {
  for (let i = failedIndex + 1; i < STAGES.length; i++) {
    setDotState(i, "skipped");
  }
}

function stageFlavorText(stage, design, analysis) {
  if (stage.id === "insertion") {
    if (design.orbit.id === "leo") return t("simulation.flavor.insertionLeo");
    if (design.fuel.electric) {
      return t("simulation.flavor.insertionElectric", { months: Math.round(analysis.transferYears * 12) });
    }
    return t("simulation.flavor.insertionGeo");
  }
  return t("simulation.flavor." + stage.id);
}

async function animateStageAttempt(stage, index, design, analysis) {
  const prevPercent = index === 0 ? FLIGHT_START_PERCENT : STAGE_TARGET_PERCENT_BY_ID[STAGES[index - 1].id];
  const targetPercent = STAGE_TARGET_PERCENT_BY_ID[stage.id];
  const midPercent = prevPercent + (targetPercent - prevPercent) * 0.55;

  setDotState(index, "active");
  document.getElementById("simulation-log").textContent =
    t("simulation.checking", { stage: t("stage." + stage.id) }) + "\n" + stageFlavorText(stage, design, analysis);

  setRocketFlying(true);
  await setSceneProgress(midPercent, 900);
}

async function animateOperationYears(design, analysis, outcome) {
  const log = document.getElementById("simulation-log");
  setRocketFlying(false);
  const plannedYears = design.orbit.designLifeYears;
  const lastYear = outcome.failedStageId === "operation" ? outcome.serviceYears : analysis.reliability.lifeYears;
  const stepMs = Math.max(90, Math.round(1600 / plannedYears));

  for (let year = 1; year <= Math.floor(lastYear); year++) {
    log.textContent = t("simulation.operatingYear", { year, total: plannedYears });
    await sleep(stepMs);
  }
}

async function animateStageResolve(stage, index, passed) {
  const log = document.getElementById("simulation-log");
  const targetPercent = STAGE_TARGET_PERCENT_BY_ID[stage.id];
  const stageName = t("stage." + stage.id);

  if (passed) {
    setDotState(index, "pass");
    log.textContent = t("simulation.passed", { stage: stageName });
    sfxPass();
    await setSceneProgress(targetPercent, 500);
    setRocketFlying(false);
    await sleep(300);
  } else {
    setRocketFlying(false);
    setRocketExploding(true);
    setDotState(index, "fail");
    log.textContent = t("simulation.failed", { stage: stageName });
    sfxFail();
    markRemainingDotsSkipped(index);
    await sleep(1000);
  }
}
