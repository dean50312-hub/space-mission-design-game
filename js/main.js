// 畫面切換與流程控制

let lastResultsContext = null;

document.addEventListener("DOMContentLoaded", () => {
  gameState.failCount = storageGetFailCount();
  applyStaticTranslations();
  initSettingsUI();

  document.addEventListener("click", (e) => {
    if (e.target.closest(".btn, .part-card, .lang-btn")) sfxClick();
  });

  document.getElementById("home-start-btn").addEventListener("click", startNewGame);
  document.getElementById("home-achievements-btn").addEventListener("click", () => showScreen("achievements"));
  document.getElementById("home-settings-btn").addEventListener("click", () => showScreen("settings"));
  document.getElementById("achievements-back-btn").addEventListener("click", goHome);
  document.getElementById("settings-back-btn").addEventListener("click", goHome);

  document.getElementById("start-btn").addEventListener("click", () => showScreen("selection"));
  document.getElementById("launch-btn").addEventListener("click", startSimulation);
  document.getElementById("play-again-btn").addEventListener("click", startNewGame);
  document.getElementById("results-home-btn").addEventListener("click", goHome);

  document.getElementById("tutorial-next-btn").addEventListener("click", tutorialNext);
  document.getElementById("tutorial-skip-btn").addEventListener("click", skipAllTutorials);

  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.addEventListener("click", () => handleLangChange(btn.dataset.lang));
  });
  document.getElementById("settings-sound-toggle").addEventListener("change", handleSoundToggleChange);
  document.getElementById("settings-volume-slider").addEventListener("input", handleVolumeChange);
  document.getElementById("settings-reset-btn").addEventListener("click", handleResetProgress);

  goHome();
});

function goHome() {
  showScreen("home");
  showTutorialIfNeeded("home");
}

function startNewGame() {
  resetForNewGame();
  renderEventScreen();
  showScreen("event");
  showTutorialIfNeeded("event");
}

function renderEventScreen() {
  const event = gameState.event;
  document.getElementById("event-icon").textContent = event.icon;
  document.getElementById("event-name").textContent = t("event." + event.id + ".name");
  document.getElementById("event-desc").textContent = t("event." + event.id + ".desc");
  document.getElementById("event-budget-note").textContent = event.effect.budgetDelta
    ? t("event.budgetNoteAdjusted", { budget: gameState.budget })
    : t("event.budgetNoteNormal", { budget: gameState.budget });
}

function showScreen(name) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  document.getElementById(`screen-${name}`).classList.add("active");
  if (name === "selection") renderSelectionScreen();
  if (name === "achievements") renderAchievementsGallery();
}

async function startSimulation() {
  showScreen("simulation");
  resetFlightView();
  sfxLaunch();

  await showTutorialIfNeeded("simulation");

  const simResult = await runSimulation();

  await sleep(500);
  finishMission(simResult);
}

function finishMission(simResult) {
  const scores = computeRadarScores(simResult);
  const cost = currentCostUsed();
  const failCountBeforeThis = gameState.failCount;

  if (!simResult.overallSuccess) {
    gameState.failCount = storageIncrementFailCount();
  }

  const achievements = evaluateAchievements({
    simResult,
    scores,
    cost,
    budget: gameState.budget,
    event: gameState.event,
    failCountBeforeThis,
  });

  if (simResult.overallSuccess) sfxSuccess();
  if (achievements.length > 0) setTimeout(sfxAchievement, 400);

  lastResultsContext = { simResult, scores, achievements };
  renderResultsScreen(simResult, scores, achievements);
  showScreen("results");
  showTutorialIfNeeded("results");
}

function refreshDynamicScreenText() {
  const active = document.querySelector(".screen.active");
  if (!active) return;

  if (active.id === "screen-event") renderEventScreen();
  if (active.id === "screen-selection") renderSelectionScreen();
  if (active.id === "screen-achievements") renderAchievementsGallery();
  if (active.id === "screen-results" && lastResultsContext) {
    renderResultsScreen(lastResultsContext.simResult, lastResultsContext.scores, lastResultsContext.achievements);
  }

  if (!document.getElementById("tutorial-overlay").classList.contains("hidden")) {
    renderTutorialLine();
  }
}
