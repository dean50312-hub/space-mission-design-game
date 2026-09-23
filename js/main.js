// 畫面切換與流程控制

let lastResultsContext = null;

document.addEventListener("DOMContentLoaded", () => {
  gameState.failCount = storageGetFailCount();
  applyStaticTranslations();
  initSettingsUI();

  document.addEventListener("click", (e) => {
    if (e.target.closest(".btn, .part-card, .lang-btn")) sfxClick();
  });

  document.getElementById("home-start-btn").addEventListener("click", startFreePlay);
  document.getElementById("home-campaign-btn").addEventListener("click", startNextCampaignLevel);
  document.getElementById("home-achievements-btn").addEventListener("click", () => showScreen("achievements"));
  document.getElementById("home-settings-btn").addEventListener("click", () => showScreen("settings"));
  document.getElementById("achievements-back-btn").addEventListener("click", goHome);
  document.getElementById("settings-back-btn").addEventListener("click", goHome);

  document.getElementById("start-btn").addEventListener("click", () => showScreen("selection"));
  document.getElementById("launch-btn").addEventListener("click", startSimulation);
  document.getElementById("play-again-btn").addEventListener("click", () => {
    if (gameState.campaignLevel) startCampaignLevel(gameState.campaignLevel);
    else startFreePlay();
  });
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
  renderHomeScreen();
  showScreen("home");
  showTutorialIfNeeded("home");
}

function renderHomeScreen() {
  const campaignComplete = storageIsCampaignComplete();
  const currentLevel = storageGetCampaignLevel();

  const startBtn = document.getElementById("home-start-btn");
  startBtn.disabled = !campaignComplete;
  startBtn.textContent = campaignComplete ? t("home.startGame") : t("home.startGameLocked");

  const campaignBtn = document.getElementById("home-campaign-btn");
  campaignBtn.textContent = campaignComplete
    ? t("home.campaignReplay")
    : t("home.campaignProgress", { level: currentLevel, total: 4 });
}

function startFreePlay() {
  gameState.campaignLevel = null;
  startNewGame();
}

function startNextCampaignLevel() {
  const level = Math.min(storageGetCampaignLevel(), 4);
  startCampaignLevel(level);
}

function startCampaignLevel(level) {
  gameState.campaignLevel = level;
  startNewGame();
}

function startNewGame() {
  resetForNewGame();
  renderEventScreen();
  showScreen("event");
  showTutorialIfNeeded("event");
}

function renderEventScreen() {
  const objectiveCard = document.getElementById("objective-card");
  if (gameState.features.orbit) {
    const objective = gameState.missionObjective;
    document.getElementById("objective-icon").textContent = t("objective." + objective.id + ".icon");
    document.getElementById("objective-name").textContent = t("objective." + objective.id + ".name");
    document.getElementById("objective-desc").textContent = t("objective." + objective.id + ".desc");
    objectiveCard.classList.remove("hidden");
  } else {
    objectiveCard.classList.add("hidden");
  }

  const eventCard = document.getElementById("event-reveal-card");
  if (gameState.features.events) {
    const event = gameState.event;
    document.getElementById("event-icon").textContent = event.icon;
    document.getElementById("event-name").textContent = t("event." + event.id + ".name");
    document.getElementById("event-desc").textContent = t("event." + event.id + ".desc");
    eventCard.classList.remove("hidden");
  } else {
    eventCard.classList.add("hidden");
  }

  const hasBudgetAdjustment = gameState.event && gameState.event.effect.budgetDelta;
  document.getElementById("event-budget-note").textContent = hasBudgetAdjustment
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
    rocket: gameState.rocket,
    parts: gameState.parts,
  });

  if (simResult.overallSuccess) sfxSuccess();
  if (achievements.length > 0) setTimeout(sfxAchievement, 400);

  let campaignAward = null;
  if (gameState.campaignLevel && simResult.overallSuccess) {
    const earned = awardSkillPointsForScores(scores);
    storageCompleteCampaignLevel(gameState.campaignLevel);
    campaignAward = { level: gameState.campaignLevel, points: earned };
  }

  lastResultsContext = { simResult, scores, achievements, campaignAward };
  renderResultsScreen(simResult, scores, achievements, campaignAward);
  showScreen("results");
  showTutorialIfNeeded("results");
}

function awardSkillPointsForScores(scores) {
  const values = Object.values(scores).filter((v) => v > 0);
  if (values.length === 0) return 0;
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  const points = Math.max(1, Math.round(avg / 20));
  storageAddSkillPoints(points);
  return points;
}

function refreshDynamicScreenText() {
  const active = document.querySelector(".screen.active");
  if (!active) return;

  if (active.id === "screen-home") renderHomeScreen();
  if (active.id === "screen-event") renderEventScreen();
  if (active.id === "screen-selection") renderSelectionScreen();
  if (active.id === "screen-achievements") renderAchievementsGallery();
  if (active.id === "screen-results" && lastResultsContext) {
    renderResultsScreen(
      lastResultsContext.simResult,
      lastResultsContext.scores,
      lastResultsContext.achievements,
      lastResultsContext.campaignAward
    );
  }

  if (!document.getElementById("tutorial-overlay").classList.contains("hidden")) {
    renderTutorialLine();
  }
}
