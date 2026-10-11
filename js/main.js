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

async function startNewGame() {
  resetForNewGame();
  renderEventScreen();
  showScreen("event");
  if (gameState.campaignLevel >= 2) await showTutorialIfNeeded("level" + gameState.campaignLevel);
  showTutorialIfNeeded("event");
}

function renderEventScreen() {
  const objective = gameState.missionObjective;
  document.getElementById("objective-icon").textContent = t("objective." + objective.id + ".icon");
  document.getElementById("objective-name").textContent = t("objective." + objective.id + ".name");
  document.getElementById("objective-desc").textContent = t("objective." + objective.id + ".desc");
  document.getElementById("objective-req").textContent = t("objective." + objective.id + ".req");
  document.getElementById("objective-card").classList.remove("hidden");

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

  const orbitGroup = document.getElementById("event-orbit-group");
  orbitGroup.innerHTML = "";
  orbitGroup.appendChild(renderOrbitGroup(renderEventScreen));

  const budgetNote = document.getElementById("event-budget-note");
  if (!gameState.orbit) {
    budgetNote.textContent = t("event.pickOrbitNote");
  } else {
    const delta = (gameState.event && gameState.event.effect.budgetDeltaM) || 0;
    budgetNote.textContent = delta
      ? t("event.budgetNoteAdjusted", { budget: fmtMoney(gameState.budget), delta: fmtMoney(Math.abs(delta)) })
      : t("event.budgetNoteNormal", { budget: fmtMoney(gameState.budget) });
  }

  document.getElementById("start-btn").disabled = !gameState.orbit;
}

const SCREEN_BGM = {
  home: "space",
  achievements: "space",
  settings: "space",
  event: "lab",
  selection: "lab",
  simulation: "launch",
  results: "space",
};

function showScreen(name) {
  playBgm(SCREEN_BGM[name]);
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
  const failCountBeforeThis = gameState.failCount;

  if (!simResult.overallSuccess) {
    gameState.failCount = storageIncrementFailCount();
  }

  const achievements = evaluateAchievements({
    simResult,
    analysis: simResult.analysis,
    event: gameState.event,
    failCountBeforeThis,
    rocket: gameState.rocket,
    parts: gameState.parts,
  });

  if (simResult.overallSuccess) sfxSuccess();
  if (achievements.length > 0) setTimeout(sfxAchievement, 400);

  let campaignAward = null;
  if (gameState.campaignLevel && simResult.deliveredValue >= CAMPAIGN_PASS_VALUE) {
    const earned = Math.max(1, Math.round(simResult.deliveredValue * 5));
    storageAddSkillPoints(earned);
    storageCompleteCampaignLevel(gameState.campaignLevel);
    campaignAward = { level: gameState.campaignLevel, points: earned };
  }

  lastResultsContext = { simResult, achievements, campaignAward };
  renderResultsScreen(simResult, achievements, campaignAward);
  showScreen("results");
  showTutorialIfNeeded("results");
}

function refreshDynamicScreenText() {
  const active = document.querySelector(".screen.active");
  if (!active) return;

  if (active.id === "screen-home") renderHomeScreen();
  if (active.id === "screen-event") renderEventScreen();
  if (active.id === "screen-selection") renderSelectionScreen();
  if (active.id === "screen-achievements") renderAchievementsGallery();
  if (active.id === "screen-results" && lastResultsContext) {
    renderResultsScreen(lastResultsContext.simResult, lastResultsContext.achievements, lastResultsContext.campaignAward);
  }

  if (!document.getElementById("tutorial-overlay").classList.contains("hidden")) {
    renderTutorialLine();
  }
}
