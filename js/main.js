// 畫面切換與流程控制

let lastResultsContext = null;

document.addEventListener("DOMContentLoaded", () => {
  gameState.failCount = storageGetFailCount();
  applyStaticTranslations();
  initSettingsUI();

  FX.init();
  initCodex();

  document.getElementById("home-start-btn").addEventListener("click", startFreePlay);
  document.getElementById("home-campaign-btn").addEventListener("click", startNextCampaignLevel);
  document.getElementById("home-custom-btn").addEventListener("click", openCustomSetup);
  document.getElementById("custom-back-btn").addEventListener("click", goHome);
  document.getElementById("custom-start-btn").addEventListener("click", startCustomGame);
  document.getElementById("home-achievements-btn").addEventListener("click", () => showScreen("achievements"));
  document.getElementById("home-settings-btn").addEventListener("click", () => showScreen("settings"));
  document.getElementById("achievements-back-btn").addEventListener("click", goHome);
  document.getElementById("settings-back-btn").addEventListener("click", goHome);

  document.getElementById("start-btn").addEventListener("click", () => showScreen("selection"));
  document.getElementById("event-home-btn").addEventListener("click", goHome);
  document.getElementById("selection-back-btn").addEventListener("click", () => {
    renderEventScreen();
    showScreen("event");
  });
  document.getElementById("launch-btn").addEventListener("click", startSimulation);
  document.getElementById("play-again-btn").addEventListener("click", () => {
    if (gameState.campaignLevel) startCampaignLevel(gameState.campaignLevel);
    else if (gameState.custom) startNewGame();
    else startFreePlay();
  });
  document.getElementById("results-home-btn").addEventListener("click", goHome);

  document.getElementById("tutorial-next-btn").addEventListener("click", tutorialNext);
  document.getElementById("uplink-btn").addEventListener("click", () => finishUplink(true));
  document.getElementById("tutorial-skip-btn").addEventListener("click", skipAllTutorials);

  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.addEventListener("click", () => handleLangChange(btn.dataset.lang));
  });
  document.getElementById("settings-sound-toggle").addEventListener("change", handleSoundToggleChange);
  document.getElementById("settings-volume-slider").addEventListener("input", handleVolumeChange);
  document.getElementById("settings-reset-btn").addEventListener("click", handleResetProgress);

  document.querySelectorAll(".lang-pick-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      handleLangChange(btn.dataset.lang);
      storageUpdateSettings({ langChosen: true });
      document.getElementById("lang-overlay").classList.add("hidden");
      showTutorialIfNeeded("home");
    });
  });

  renderHomeScreen();
  showScreen("home");
  // 第一次進來先選語言，選完才開始首頁教學
  if (storageGetSettings().langChosen) showTutorialIfNeeded("home");
  else document.getElementById("lang-overlay").classList.remove("hidden");
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

  // 自訂模式一開始就開放：老師、評審可以直接挑想看的任務和事件
  document.getElementById("home-custom-btn").textContent = t("home.custom");

  const campaignBtn = document.getElementById("home-campaign-btn");
  campaignBtn.textContent = campaignComplete
    ? t("home.campaignReplay")
    : t("home.campaignProgress", { level: currentLevel, total: 4 });

  document.getElementById("home-campaign-progress").innerHTML = tt("home.levelNames")
    .map((name, i) => {
      const level = i + 1;
      const state = campaignComplete || level < currentLevel ? "done" : level === currentLevel ? "current" : "";
      return `<li class="campaign-pip ${state}"><span class="campaign-pip-box">${level}</span>${name}</li>`;
    })
    .join("");

  document.getElementById("home-records").innerHTML = MISSION_OBJECTIVES.map((objective) => {
    const best = storageGetBestScore(objective.id);
    const grade = best === undefined ? null : scoreGrade(best);
    const score = grade
      ? `<span class="record-score has-grade"><span class="grade-letter grade-${grade}">${grade}</span> ${best}</span>`
      : `<span class="record-score">${t("home.notPlayed")}</span>`;
    const medals = medalsFor(objective)
      .map((m) => `<img src="image/icons/medal-${m.id}.png" class="${storageHasMedal(objective.id, m.id) ? "" : "locked"}" alt="" />`)
      .join("");
    return `
      <div class="record-tile">
        <img class="record-icon" src="image/icons/objective-${objective.id}.png" alt="" />
        <span class="record-name">${t("objective." + objective.id + ".short")}</span>
        ${score}
        <span class="record-medals">${medals}</span>
      </div>`;
  }).join("");
}

function startFreePlay() {
  gameState.campaignLevel = null;
  gameState.custom = null;
  startNewGame();
}

// ---------- 自訂模式：自己挑任務目標和事件，其他和自由遊玩一樣全機制開放 ----------

let customChoice = { objectiveId: MISSION_OBJECTIVES[0].id, eventId: "nominal" };

function openCustomSetup() {
  renderCustomSetup();
  showScreen("custom");
}

function customCard(iconSrc, name, desc, selected, onClick) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "part-card custom-card" + (selected ? " selected" : "");
  card.innerHTML = `
    <img class="custom-card-icon" src="${iconSrc}" alt="" />
    <div class="part-name">${name}</div>
    <div class="part-stats">${desc}</div>`;
  card.addEventListener("click", onClick);
  return card;
}

function renderCustomSetup() {
  const objectives = document.getElementById("custom-objectives");
  objectives.innerHTML = "";
  MISSION_OBJECTIVES.forEach((o) => {
    objectives.appendChild(customCard(`image/icons/objective-${o.id}.png`, t("objective." + o.id + ".short"), t("objective." + o.id + ".req"),
      customChoice.objectiveId === o.id, () => {
        customChoice.objectiveId = o.id;
        renderCustomSetup();
      }));
  });
  const events = document.getElementById("custom-events");
  events.innerHTML = "";
  EVENTS.forEach((e) => {
    events.appendChild(customCard(`image/icons/event-${e.id}.png`, t("event." + e.id + ".name"), t("brief.event." + e.id),
      customChoice.eventId === e.id, () => {
        customChoice.eventId = e.id;
        renderCustomSetup();
      }));
  });
}

function startCustomGame() {
  gameState.campaignLevel = null;
  gameState.custom = { ...customChoice };
  startNewGame();
}

function startNextCampaignLevel() {
  const level = Math.min(storageGetCampaignLevel(), 4);
  startCampaignLevel(level);
}

function startCampaignLevel(level) {
  gameState.campaignLevel = level;
  gameState.custom = null;
  startNewGame();
}

async function startNewGame() {
  resetForNewGame();
  FX.resetSheetMemory();
  renderEventScreen();
  showScreen("event");
  if (gameState.campaignLevel >= 2) await showTutorialIfNeeded("level" + gameState.campaignLevel);
  showTutorialIfNeeded("event");
}

function renderEventScreen() {
  const objective = gameState.missionObjective;
  document.getElementById("objective-icon").src = `image/icons/objective-${objective.id}.png`;
  document.getElementById("objective-name").textContent = t("objective." + objective.id + ".short");
  document.getElementById("objective-desc").textContent = t("objective." + objective.id + ".desc");
  document.getElementById("objective-req").textContent = t("objective." + objective.id + ".req");
  document.getElementById("objective-card").classList.remove("hidden");

  const eventCard = document.getElementById("event-reveal-card");
  if (gameState.features.events) {
    const event = gameState.event;
    document.getElementById("event-icon").src = `image/icons/event-${event.id}.png`;
    document.getElementById("event-name").textContent = t("event." + event.id + ".name");
    document.getElementById("event-desc").innerHTML = `${t("brief.event." + event.id)} ${codexLinkHtml("events", "events-" + event.id)}`;
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
    let key = "event.budgetNoteNormal";
    if (delta < 0) key = "event.budgetNoteAdjusted";
    if (delta > 0) key = "event.budgetNoteIncreased";
    budgetNote.textContent = t(key, { budget: fmtMoney(gameState.budget), delta: fmtMoney(Math.abs(delta)) });
  }

  document.getElementById("start-btn").disabled = !gameState.orbit;
  renderCampaignHint("event-hint");
  renderLearningObjectives();
}

// ---------- 卡關提示：同一關連續沒過兩次以上，ORBIT 依理論最佳設計透露方向，每多失敗一次多講一點 ----------

const HINT_MIN_FAILURES = 2;

function campaignHintItems() {
  if (!gameState.campaignLevel) return [];
  const failures = storageGetLevelFailures(gameState.campaignLevel);
  if (failures < HINT_MIN_FAILURES) return [];
  const objective = gameState.missionObjective;
  const best = bestDesignFor(objective, gameState.event, gameState.features);
  if (!best) return [];
  const items = [t("hint.orbit", { orbit: t("orbit." + best.orbit), reason: t(`coverageExplain.${objective.id}.${best.orbit}`) })];
  if (failures >= HINT_MIN_FAILURES + 1) items.push(t("hint.rocket", { rocket: t("rocket." + best.rocket + ".name") }));
  if (failures >= HINT_MIN_FAILURES + 2) {
    items.push(t("hint.payload", { part: hotspotLabel("payload"), tier: t("tier." + best.parts.payload) }));
  }
  return items;
}

function renderCampaignHint(elementId) {
  const el = document.getElementById(elementId);
  const items = campaignHintItems();
  el.classList.toggle("hidden", items.length === 0);
  if (items.length === 0) return;
  el.innerHTML = `
    <img class="orbit-hint-avatar" src="image/icons/mascot-orbit.png" alt="" />
    <div>
      <div class="orbit-hint-title">${t("hint.title", { n: storageGetLevelFailures(gameState.campaignLevel) })}</div>
      <ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>
    </div>`;
}

const SCREEN_BGM = {
  home: "space",
  achievements: "space",
  custom: "space",
  codex: "space",
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
  if (name === "selection") {
    renderSelectionScreen();
    renderCampaignHint("selection-hint");
  }
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

  if (outcomeKind(simResult) === "success") sfxSuccess();
  if (achievements.length > 0) setTimeout(sfxAchievement, 400);

  const scoreInfo = scoreMission(simResult);

  // 過關：交付夠多價值，或設計本身夠好——運氣差但決策正確，審查委員會放行
  let campaignAward = null;
  const passedByValue = simResult.deliveredValue >= CAMPAIGN_PASS_VALUE;
  const passedByScore = scoreInfo.designScore !== null && scoreInfo.designScore >= CAMPAIGN_PASS_SCORE;
  if (gameState.campaignLevel && (passedByValue || passedByScore)) {
    const earned = Math.max(1, Math.round(simResult.deliveredValue * 5));
    storageAddSkillPoints(earned);
    storageCompleteCampaignLevel(gameState.campaignLevel);
    campaignAward = { level: gameState.campaignLevel, points: earned, byScore: !passedByValue };
  }
  if (gameState.campaignLevel) {
    const level = gameState.campaignLevel;
    storageSetLevelFailures(level, campaignAward ? 0 : storageGetLevelFailures(level) + 1);
  }

  const quiz = pickQuiz(gameState.campaignLevel, simResult.design);
  lastResultsContext = { simResult, achievements, campaignAward, scoreInfo, quiz };
  renderResultsScreen(simResult, achievements, campaignAward, scoreInfo);
  renderQuiz(quiz);
  showScreen("results");
  showTutorialIfNeeded("results");
}

function scoreMission(simResult) {
  const { design, analysis } = simResult;
  const best = bestDesignFor(design.objective, design.event, gameState.features);
  // designScore 只看設計；score 是這次的成績，任務沒達成目標時最高 B，勳章也只在任務達成時頒發
  const designScore = actuarialScore(simResult.expectedValue, best);
  const goalMet = simResult.deliveredValue >= CAMPAIGN_PASS_VALUE;
  const score = designScore === null || goalMet ? designScore : Math.min(designScore, FAILED_MISSION_SCORE_CAP);
  const previousBest = score !== null ? storageRecordScore(design.objective.id, score) : undefined;
  const medals = evaluateMedals(design.objective, { score: goalMet ? score : null, design, analysis });
  return { score, designScore, capped: score !== designScore, grade: score !== null ? scoreGrade(score) : null, best, previousBest, medals };
}

function refreshDynamicScreenText() {
  const active = document.querySelector(".screen.active");
  if (!active) return;

  if (active.id === "screen-home") renderHomeScreen();
  if (active.id === "screen-event") renderEventScreen();
  if (active.id === "screen-selection") {
    renderSelectionScreen();
    renderCampaignHint("selection-hint");
  }
  if (active.id === "screen-achievements") renderAchievementsGallery();
  if (active.id === "screen-custom") renderCustomSetup();
  if (active.id === "screen-results" && lastResultsContext) {
    const c = lastResultsContext;
    renderResultsScreen(c.simResult, c.achievements, c.campaignAward, c.scoreInfo);
    renderQuiz(c.quiz);
  }

  if (!document.getElementById("tutorial-overlay").classList.contains("hidden")) {
    renderTutorialLine();
  }
}
