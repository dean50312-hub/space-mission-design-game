// 本機存檔（localStorage）：成就、失敗次數、教學進度、設定

const STORAGE_KEY = "csm_save_v1";

function defaultSave() {
  return {
    unlockedAchievements: [],
    failCount: 0,
    tutorialSeen: {},
    settings: { lang: "zh", soundOn: true, volume: 0.6 },
  };
}

function loadSave() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw);
    const base = defaultSave();
    return {
      ...base,
      ...parsed,
      settings: { ...base.settings, ...(parsed.settings || {}) },
      tutorialSeen: { ...base.tutorialSeen, ...(parsed.tutorialSeen || {}) },
      unlockedAchievements: Array.isArray(parsed.unlockedAchievements) ? parsed.unlockedAchievements : [],
    };
  } catch (e) {
    return defaultSave();
  }
}

function writeSave(save) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  } catch (e) {
    // localStorage 不可用（例如私密瀏覽模式）— 靜默失敗，僅本次不保存
  }
}

let saveData = loadSave();

function storageGetUnlockedAchievements() {
  return saveData.unlockedAchievements;
}

function storageUnlockAchievement(id) {
  if (!saveData.unlockedAchievements.includes(id)) {
    saveData.unlockedAchievements.push(id);
    writeSave(saveData);
  }
}

function storageIsAchievementUnlocked(id) {
  return saveData.unlockedAchievements.includes(id);
}

function storageGetFailCount() {
  return saveData.failCount;
}

function storageIncrementFailCount() {
  saveData.failCount++;
  writeSave(saveData);
  return saveData.failCount;
}

function storageHasSeenTutorial(key) {
  return Boolean(saveData.tutorialSeen[key]);
}

function storageMarkTutorialSeen(key) {
  saveData.tutorialSeen[key] = true;
  writeSave(saveData);
}

function storageGetSettings() {
  return saveData.settings;
}

function storageUpdateSettings(partial) {
  saveData.settings = { ...saveData.settings, ...partial };
  writeSave(saveData);
}

function storageResetProgress() {
  saveData = { ...defaultSave(), settings: saveData.settings };
  writeSave(saveData);
}
