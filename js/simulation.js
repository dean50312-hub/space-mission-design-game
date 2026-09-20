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

async function runSimulation(onStageStart, onStageResult) {
  let stageReachedIndex = -1;
  let overallSuccess = true;
  let failedStage = null;

  for (let i = 0; i < STAGES.length; i++) {
    const stage = STAGES[i];
    onStageStart(stage, i);
    await sleep(900);

    const result = runStageCheck(stage);
    stageReachedIndex = i;
    onStageResult(stage, i, result);
    await sleep(600);

    if (!result.passed) {
      overallSuccess = false;
      failedStage = stage;
      break;
    }
  }

  return { stageReachedIndex, overallSuccess, failedStage };
}

// ---------- 模擬畫面 DOM ----------

function resetSimulationView() {
  const track = document.getElementById("stage-track");
  track.innerHTML = "";

  STAGES.forEach((stage, i) => {
    const box = document.createElement("div");
    box.className = "stage-box pending";
    box.id = `stage-box-${i}`;
    box.innerHTML = `
      <div class="stage-icon">・</div>
      <div class="stage-name">${stage.name}</div>
    `;
    track.appendChild(box);
  });

  document.getElementById("simulation-log").textContent = "";
}

function setStageState(index, state) {
  const box = document.getElementById(`stage-box-${index}`);
  box.classList.remove("pending", "active", "pass", "fail");
  box.classList.add(state);

  const icon = box.querySelector(".stage-icon");
  const log = document.getElementById("simulation-log");
  const stageName = STAGES[index].name;

  if (state === "active") {
    icon.textContent = "🚀";
    log.textContent = `正在檢定：${stageName} ...`;
  } else if (state === "pass") {
    icon.textContent = "✅";
    log.textContent = `${stageName}：通過`;
  } else if (state === "fail") {
    icon.textContent = "💥";
    log.textContent = `${stageName}：失敗！`;
    markRemainingSkipped(index);
  }
}

function markRemainingSkipped(failedIndex) {
  for (let i = failedIndex + 1; i < STAGES.length; i++) {
    const box = document.getElementById(`stage-box-${i}`);
    box.classList.remove("pending");
    box.classList.add("skipped");
    box.querySelector(".stage-icon").textContent = "—";
  }
}
