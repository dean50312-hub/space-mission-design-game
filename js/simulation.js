// 任務模擬：階段判定邏輯 + 模擬畫面動畫

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
      return gameState.parts.propulsion.value;
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
  const effect = gameState.event && gameState.event.effect;
  if (!effect || effect.stage !== stageId) return 0;
  if (effect.stat && effect.stat === statKey) return effect.bonus || 0;
  if (!effect.stat && !effect.addCheck) return effect.bonus || 0;
  return 0;
}

function evalCheck(statKey, value, threshold) {
  const margin = value - threshold;
  const failRate = failureRateFromMargin(margin);
  const failed = Math.random() < failRate;
  return { statKey, value, threshold, margin, failRate, failed };
}

function runStageCheck(stage) {
  const checks = [];

  if (stage.id === "operation") {
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

async function runSimulation() {
  let stageReachedIndex = -1;
  let overallSuccess = true;
  let failedStage = null;

  for (let i = 0; i < STAGES.length; i++) {
    const stage = STAGES[i];
    await animateStageAttempt(stage, i);

    const result = runStageCheck(stage);
    stageReachedIndex = i;
    await animateStageResolve(stage, i, result);

    if (!result.passed) {
      overallSuccess = false;
      failedStage = stage;
      break;
    }
  }

  return { stageReachedIndex, overallSuccess, failedStage };
}

// ---------- 模擬畫面 DOM：火箭飛行動畫 ----------

// 每個階段「成功完成後」火箭在飛行軌道上的高度（bottom %）
const FLIGHT_START_PERCENT = 4;
const STAGE_TARGET_PERCENTS = [18, 40, 62, 78, 92];

function resetFlightView() {
  const rocket = document.getElementById("rocket");
  rocket.style.transition = "none";
  rocket.style.bottom = `${FLIGHT_START_PERCENT}%`;
  rocket.textContent = "🚀";
  rocket.classList.remove("exploding");
  void rocket.offsetHeight; // 強制 reflow，確保下一次移動會套用 transition
  rocket.style.transition = "";

  document.getElementById("simulation-log").textContent = "";

  const dotsWrap = document.getElementById("stage-dots");
  dotsWrap.innerHTML = "";
  STAGES.forEach((stage, i) => {
    const dot = document.createElement("span");
    dot.className = "stage-dot";
    dot.id = `stage-dot-${i}`;
    dot.title = stage.name;
    dotsWrap.appendChild(dot);
  });
}

function setRocketBottom(percent, durationMs) {
  const rocket = document.getElementById("rocket");
  rocket.style.transition = `bottom ${durationMs}ms ease-in-out`;
  rocket.style.bottom = `${percent}%`;
  return sleep(durationMs);
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

async function animateStageAttempt(stage, index) {
  const prevPercent = index === 0 ? FLIGHT_START_PERCENT : STAGE_TARGET_PERCENTS[index - 1];
  const targetPercent = STAGE_TARGET_PERCENTS[index];
  const midPercent = prevPercent + (targetPercent - prevPercent) * 0.55;

  setDotState(index, "active");
  document.getElementById("simulation-log").textContent = `正在檢定：${stage.name} ...`;
  await setRocketBottom(midPercent, 900);
}

async function animateStageResolve(stage, index, result) {
  const log = document.getElementById("simulation-log");
  const targetPercent = STAGE_TARGET_PERCENTS[index];

  if (result.passed) {
    setDotState(index, "pass");
    log.textContent = `${stage.name}：通過`;
    await setRocketBottom(targetPercent, 500);
    await sleep(300);
  } else {
    const rocket = document.getElementById("rocket");
    rocket.textContent = "💥";
    rocket.classList.add("exploding");
    setDotState(index, "fail");
    log.textContent = `${stage.name}：失敗！`;
    markRemainingDotsSkipped(index);
    await sleep(1000);
  }
}
