// 本機存檔（localStorage）：成就、失敗次數、教學進度、設定

const STORAGE_KEY = "csm_save_v1";

function defaultSave() {
  return {
    unlockedAchievements: [],
    failCount: 0,
    tutorialSeen: {},
    settings: { lang: "zh", soundOn: true, volume: 0.6 },
    campaign: { currentLevel: 1, completed: false, failures: {} }, // failures：關卡 → 連續沒過關的次數
    skillPoints: 0,
    unlockedSkills: [],
    medals: {}, // 任務目標 id → 已取得的勳章 id 陣列
    bestScores: {}, // 任務目標 id → 最高精算評分
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
      campaign: { ...base.campaign, ...(parsed.campaign || {}) },
      unlockedSkills: Array.isArray(parsed.unlockedSkills) ? parsed.unlockedSkills : [],
      medals: { ...(parsed.medals || {}) },
      bestScores: { ...(parsed.bestScores || {}) },
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

// ---------- 戰役關卡進度 ----------

function storageGetCampaignLevel() {
  return saveData.campaign.currentLevel;
}

function storageGetLevelFailures(level) {
  return (saveData.campaign.failures || {})[level] || 0;
}

function storageSetLevelFailures(level, count) {
  saveData.campaign.failures = { ...(saveData.campaign.failures || {}), [level]: count };
  writeSave(saveData);
}

function storageIsCampaignComplete() {
  return saveData.campaign.completed;
}

function storageCompleteCampaignLevel(level) {
  if (level >= saveData.campaign.currentLevel) {
    saveData.campaign.currentLevel = level + 1;
  }
  if (level >= 4) {
    saveData.campaign.completed = true;
  }
  writeSave(saveData);
}

// ---------- 挑戰勳章與個人最佳 ----------

function storageHasMedal(objectiveId, medalId) {
  return (saveData.medals[objectiveId] || []).includes(medalId);
}

function storageAwardMedal(objectiveId, medalId) {
  if (storageHasMedal(objectiveId, medalId)) return;
  saveData.medals[objectiveId] = [...(saveData.medals[objectiveId] || []), medalId];
  writeSave(saveData);
}

function storageGetBestScore(objectiveId) {
  return saveData.bestScores[objectiveId];
}

// 回傳這次之前的最高分（沒有紀錄則為 undefined）
function storageRecordScore(objectiveId, score) {
  const previous = saveData.bestScores[objectiveId];
  if (previous === undefined || score > previous) {
    saveData.bestScores[objectiveId] = score;
    writeSave(saveData);
  }
  return previous;
}

// ---------- 技能點數／技能樹（節點內容之後再做，先保留存檔欄位） ----------

function storageGetSkillPoints() {
  return saveData.skillPoints;
}

function storageAddSkillPoints(amount) {
  saveData.skillPoints += amount;
  writeSave(saveData);
  return saveData.skillPoints;
}

function storageIsSkillUnlocked(id) {
  return saveData.unlockedSkills.includes(id);
}

function storageUnlockSkill(id, cost) {
  if (storageIsSkillUnlocked(id)) return true;
  if (saveData.skillPoints < cost) return false;
  saveData.skillPoints -= cost;
  saveData.unlockedSkills.push(id);
  writeSave(saveData);
  return true;
}
