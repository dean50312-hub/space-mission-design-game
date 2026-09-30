// 任務模擬畫面：驅動任務時間軸（js/operations.js），播放火箭飛行動畫，並在運作期異常時請玩家做決定

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runSimulation() {
  const design = currentDesign();
  const analysis = analyzeDesign(design);
  const features = gameState.features;
  const expectedValue = computeExpectedValue(design, features, analysis);
  const gen = missionTimeline(analysis, design, features, makeRng((Math.random() * 2 ** 32) >>> 0));

  const log = document.getElementById("simulation-log");
  const yearStepMs = Math.max(90, Math.round(1600 / design.orbit.designLifeYears));
  let stageIndex = -1;
  let step = gen.next();

  while (!step.done) {
    const ev = step.value;
    let reply;

    if (ev.kind === "stageStart") {
      stageIndex = STAGES.findIndex((s) => s.id === ev.stageId);
      await animateStageAttempt(STAGES[stageIndex], stageIndex, design, analysis);
      if (ev.stageId === "operation") setRocketFlying(false);
    } else if (ev.kind === "stageEnd") {
      await animateStageResolve(STAGES[stageIndex], stageIndex, true);
    } else if (ev.kind === "year") {
      log.textContent = ev.phase === "extension"
        ? t("simulation.extensionYear", { year: ev.year, total: design.orbit.designLifeYears })
        : t("simulation.operatingYear", { year: ev.year, total: design.orbit.designLifeYears });
      await sleep(yearStepMs);
    } else if (ev.kind === "decision") {
      reply = await showAnomalyDecision(ev, design);
    } else if (ev.kind === "decisionResult") {
      log.textContent = decisionResultText(ev);
      await sleep(900);
    } else if (ev.kind === "extensionStart") {
      log.textContent = t("simulation.extensionStart", { years: fmtNum(ev.years, 1) });
      sfxPass();
      await sleep(1200);
    }

    step = gen.next(reply);
  }

  const outcome = step.value;
  const overallSuccess = outcome.failedStageId === null;
  const failedIndex = overallSuccess ? STAGES.length - 1 : STAGES.findIndex((s) => s.id === outcome.failedStageId);
  await animateStageResolve(STAGES[failedIndex], failedIndex, overallSuccess);

  return {
    design,
    analysis,
    expectedValue,
    overallSuccess,
    stageReachedIndex: failedIndex,
    failedStage: overallSuccess ? null : STAGES[failedIndex],
    cause: outcome.cause,
    serviceYears: outcome.serviceYears,
    extensionYears: outcome.extensionYears,
    deliveredValue: Math.max(0, outcome.deliveredValue),
    propellantDepleted: overallSuccess && outcome.propellantDepleted,
    decisions: outcome.decisions,
    reserveLeftM: outcome.reserveLeftM,
  };
}

// ---------- 運作期異常決策視窗 ----------

function anomalyTextKey(source) {
  return "anomaly." + source.id;
}

function optionEffectText(option) {
  return t("anomalyOption." + option.id + ".effect");
}

function decisionResultText(ev) {
  if (ev.succeeded === true) return t("simulation.fixSucceeded");
  if (ev.succeeded === false) return t("simulation.fixFailed");
  return t("simulation.decisionApplied", { option: t("anomalyOption." + ev.option.id + ".label") });
}

async function showAnomalyDecision(ev, design) {
  await showTutorialIfNeeded("operations");
  sfxFail();

  const overlay = document.getElementById("anomaly-overlay");
  document.getElementById("anomaly-title").textContent = t(anomalyTextKey(ev.source) + ".name");
  document.getElementById("anomaly-desc").textContent = t(anomalyTextKey(ev.source) + ".desc");
  document.getElementById("anomaly-meta").textContent = t("anomalyUi.meta", {
    year: fmtNum(ev.time, 1),
    reserve: fmtMoney(Math.round(ev.reserveM * 10) / 10),
  });
  document.getElementById("anomaly-hint").textContent = t("anomalyUi.hint");

  const list = document.getElementById("anomaly-options");
  list.innerHTML = "";

  return new Promise((resolve) => {
    ev.choices.forEach((choice, index) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "anomaly-option";
      btn.disabled = !choice.affordable;
      const cost = choice.option.costM > 0 ? fmtMoney(choice.option.costM) : t("anomalyUi.free");
      btn.innerHTML = `
        <span class="anomaly-option-head"><span>${t("anomalyOption." + choice.option.id + ".label")}</span><span class="anomaly-option-cost">${cost}</span></span>
        <span class="anomaly-option-effect">${optionEffectText(choice.option)}</span>
        <span class="anomaly-option-estimate">${choice.affordable
          ? t("anomalyUi.estimate", { value: fmtPct(Math.max(0, choice.estimate), choice.estimate < 0.1 ? 1 : 0) })
          : t("anomalyUi.cannotAfford")}</span>
      `;
      btn.addEventListener("click", () => {
        sfxClick();
        overlay.classList.add("hidden");
        resolve(index);
      });
      list.appendChild(btn);
    });
    overlay.classList.remove("hidden");
  });
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

function setRocketState(state) {
  const rocket = document.getElementById("rocket");
  rocket.classList.toggle("exploding", state === "exploded");
  rocket.classList.toggle("dead", state === "dead");
  rocket.textContent = state === "exploded" ? "💥" : state === "dead" ? "🛰️" : "🚀";
}

function resetFlightView() {
  const scene = document.getElementById("flight-scene");
  scene.style.transition = "none";
  scene.style.top = `${sceneTopForPercent(FLIGHT_START_PERCENT)}px`;
  void scene.offsetHeight; // 強制 reflow，確保下一次移動會套用 transition

  setRocketFlying(false);
  setRocketState("normal");
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
    setRocketState(stage.id === "operation" ? "dead" : "exploded");
    setDotState(index, "fail");
    log.textContent = t("simulation.failed", { stage: stageName });
    sfxFail();
    markRemainingDotsSkipped(index);
    await sleep(1000);
  }
}
