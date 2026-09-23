// 任務模擬：階段判定邏輯（依戰役關卡開放的機制動態調整）+ 火箭飛行動畫（視角固定、背景捲動）

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getStageValue(stageId, statOverride) {
  switch (stageId) {
    case "liftoff":
      return gameState.rocket.reliability;
    case "ascent":
      return gameState.parts.structure.value;
    case "insertion":
      return fuelPropulsionValue();
    case "deployment":
      return (gameState.parts.power.value + gameState.parts.comm.value) / 2;
    case "operation":
      if (statOverride === "power") return gameState.parts.power.value;
      if (statOverride === "comm") return gameState.parts.comm.value;
      if (statOverride === "structure") return gameState.parts.structure.value;
      return null;
    default:
      return null;
  }
}

function getThresholdBonus(stageId, statKey) {
  let bonus = 0;

  const effect = gameState.event && gameState.event.effect;
  if (effect && effect.stage === stageId) {
    if (effect.stat && effect.stat === statKey) bonus += effect.bonus || 0;
    else if (!effect.stat && !effect.addCheck) bonus += effect.bonus || 0;
  }

  if (gameState.orbit && stageId === "liftoff" && statKey === "reliability") {
    bonus += gameState.orbit.liftoffBonus || 0;
  }

  return bonus;
}

function evalCheck(statKey, value, threshold) {
  const margin = value - threshold;
  const failRate = failureRateFromMargin(margin);
  const failed = Math.random() < failRate;
  return { statKey, value, threshold, margin, failRate, failed };
}

function orbitMismatchCheck() {
  if (!isOrbitMismatched()) return null;
  return { statKey: "orbit_mismatch", value: 0, threshold: 0, margin: -1, failRate: 1, failed: true };
}

function runStageCheck(stage) {
  const checks = [];

  if (stage.id === "operation") {
    const mismatch = orbitMismatchCheck();
    if (mismatch) checks.push(mismatch);

    ["power", "comm"].forEach((statKey) => {
      const value = getStageValue("operation", statKey);
      const threshold = stage.baseThreshold + getThresholdBonus("operation", statKey);
      checks.push(evalCheck(statKey, value, threshold));
    });

    const effect = gameState.event && gameState.event.effect;
    if (effect && effect.stage === "operation" && effect.addCheck) {
      const value = getStageValue("operation", effect.addCheck);
      checks.push(evalCheck(effect.addCheck, value, effect.threshold));
    }
  } else {
    const statKey =
      stage.id === "liftoff" ? "reliability" : stage.id === "ascent" ? "structure" : stage.id === "insertion" ? "propulsion" : "deployment";
    const value = getStageValue(stage.id);
    const threshold = stage.baseThreshold + getThresholdBonus(stage.id, statKey);
    checks.push(evalCheck(statKey, value, threshold));
  }

  const passed = checks.every((c) => !c.failed);
  return { passed, checks };
}

function runFuelingCheck() {
  gameState.incidentPenalty = 0;
  if (!gameState.fuel || !gameState.fuel.toxic || gameState.hazmatPurchased) {
    return { relevant: false, incident: false };
  }
  const incident = Math.random() < HAZMAT_INCIDENT_CHANCE;
  if (incident) gameState.incidentPenalty = HAZMAT_INCIDENT_PENALTY;
  return { relevant: true, incident };
}

async function animateFuelingCheck() {
  const fuelingResult = runFuelingCheck();
  if (!fuelingResult.relevant) return;

  const log = document.getElementById("simulation-log");
  log.textContent = t("simulation.fueling");
  await sleep(900);

  if (fuelingResult.incident) {
    log.textContent = t("simulation.fuelingIncident");
    sfxFail();
  } else {
    log.textContent = t("simulation.fuelingOk");
    sfxPass();
  }
  await sleep(900);
}

async function runSimulation() {
  let stageReachedIndex = -1;
  let overallSuccess = true;
  let failedStage = null;
  let failedChecks = [];

  await animateFuelingCheck();

  for (let i = 0; i < currentStages.length; i++) {
    const stage = currentStages[i];
    await animateStageAttempt(stage, i);

    const result = runStageCheck(stage);
    stageReachedIndex = STAGES.findIndex((s) => s.id === stage.id);
    await animateStageResolve(stage, i, result);

    if (!result.passed) {
      overallSuccess = false;
      failedStage = stage;
      failedChecks = result.checks.filter((c) => c.failed);
      break;
    }
  }

  return { stageReachedIndex, overallSuccess, failedStage, failedChecks };
}

// ---------- 飛行動畫：視角固定在畫面中心，背景場景（地面→雲層→大氣層→太空）往下捲動 ----------

const FLIGHT_START_PERCENT = 4;
let currentStages = STAGES;

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
  currentStages = activeStagesForFeatures(gameState.features);

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
  currentStages.forEach((stage, i) => {
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
  for (let i = failedIndex + 1; i < currentStages.length; i++) {
    setDotState(i, "skipped");
  }
}

async function animateStageAttempt(stage, index) {
  const prevPercent = index === 0 ? FLIGHT_START_PERCENT : STAGE_TARGET_PERCENT_BY_ID[currentStages[index - 1].id];
  const targetPercent = STAGE_TARGET_PERCENT_BY_ID[stage.id];
  const midPercent = prevPercent + (targetPercent - prevPercent) * 0.55;

  setDotState(index, "active");
  document.getElementById("simulation-log").textContent = t("simulation.checking", { stage: t("stage." + stage.id) });

  setRocketFlying(true);
  await setSceneProgress(midPercent, 900);
}

async function animateStageResolve(stage, index, result) {
  const log = document.getElementById("simulation-log");
  const targetPercent = STAGE_TARGET_PERCENT_BY_ID[stage.id];
  const stageName = t("stage." + stage.id);

  if (result.passed) {
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
