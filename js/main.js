// 畫面切換與流程控制

document.addEventListener("DOMContentLoaded", () => {
  startNewGame();

  document.getElementById("start-btn").addEventListener("click", () => {
    showScreen("selection");
  });

  document.getElementById("launch-btn").addEventListener("click", () => {
    startSimulation();
  });

  document.getElementById("play-again-btn").addEventListener("click", () => {
    startNewGame();
  });
});

function startNewGame() {
  resetForNewGame();
  renderEventScreen();
  showScreen("event");
}

function renderEventScreen() {
  const event = gameState.event;
  document.getElementById("event-icon").textContent = event.icon;
  document.getElementById("event-name").textContent = event.name;
  document.getElementById("event-desc").textContent = event.desc;
  document.getElementById("event-budget-note").textContent = event.effect.budgetDelta
    ? `本局預算調整為 ${gameState.budget} C`
    : `本局預算 ${gameState.budget} C`;
}

function showScreen(name) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  document.getElementById(`screen-${name}`).classList.add("active");
  if (name === "selection") renderSelectionScreen();
}

async function startSimulation() {
  showScreen("simulation");
  resetSimulationView();

  const simResult = await runSimulation(
    (stage, i) => setStageState(i, "active"),
    (stage, i, result) => setStageState(i, result.passed ? "pass" : "fail")
  );

  await sleep(800);
  finishMission(simResult);
}

function finishMission(simResult) {
  const scores = computeRadarScores(simResult);
  const cost = currentCostUsed();
  const failCountBeforeThis = gameState.failCount;

  if (!simResult.overallSuccess) gameState.failCount++;

  const achievements = evaluateAchievements({
    simResult,
    scores,
    cost,
    budget: gameState.budget,
    event: gameState.event,
    failCountBeforeThis,
  });

  renderResultsScreen(simResult, scores, achievements);
  showScreen("results");
}
