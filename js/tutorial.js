// ORBIT 劇情引導：每個畫面第一次出現時，用對話框帶新手認識該畫面

const TUTORIAL_SCREENS = ["home", "event", "selection", "simulation", "results", "operations", "uplink", "uplinkGeo"];
// 劇情關卡開放新機制時的說明；「跳過教學」不會略過它們，因為每關都有新東西要知道
const LEVEL_INTRO_KEYS = ["level2", "level3", "level4"];

let tutorialActiveScreen = null;
let tutorialLineIndex = 0;
let tutorialResolve = null;

function showTutorialIfNeeded(screenKey) {
  return new Promise((resolve) => {
    const known = TUTORIAL_SCREENS.includes(screenKey) || LEVEL_INTRO_KEYS.includes(screenKey);
    if (!known || storageHasSeenTutorial(screenKey)) {
      resolve();
      return;
    }

    tutorialActiveScreen = screenKey;
    tutorialLineIndex = 0;
    tutorialResolve = resolve;
    renderTutorialLine();
    document.getElementById("tutorial-overlay").classList.remove("hidden");
  });
}

function renderTutorialLine() {
  const lines = tt("tutorial." + tutorialActiveScreen);
  document.getElementById("tutorial-text").textContent = lines[tutorialLineIndex] || "";
  document.getElementById("tutorial-next-btn").textContent =
    tutorialLineIndex >= lines.length - 1 ? t("tutorial.gotIt") : t("tutorial.next");
  document.getElementById("tutorial-skip-btn").textContent = t("tutorial.skip");
  document.getElementById("tutorial-name").textContent = t("tutorial.orbitName");
}

function tutorialNext() {
  sfxClick();
  const lines = tt("tutorial." + tutorialActiveScreen);
  if (tutorialLineIndex < lines.length - 1) {
    tutorialLineIndex++;
    renderTutorialLine();
  } else {
    closeTutorialBeat();
  }
}

function closeTutorialBeat() {
  if (tutorialActiveScreen) storageMarkTutorialSeen(tutorialActiveScreen);
  document.getElementById("tutorial-overlay").classList.add("hidden");
  tutorialActiveScreen = null;
  if (tutorialResolve) {
    const resolve = tutorialResolve;
    tutorialResolve = null;
    resolve();
  }
}

function skipAllTutorials() {
  sfxClick();
  TUTORIAL_SCREENS.forEach(storageMarkTutorialSeen);
  if (tutorialActiveScreen) storageMarkTutorialSeen(tutorialActiveScreen);
  document.getElementById("tutorial-overlay").classList.add("hidden");
  tutorialActiveScreen = null;
  if (tutorialResolve) {
    const resolve = tutorialResolve;
    tutorialResolve = null;
    resolve();
  }
}
