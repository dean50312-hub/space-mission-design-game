// 遊戲狀態管理

const gameState = {
  campaignLevel: null, // null = 自由遊玩（全機制開放）；1~4 = 戰役關卡
  custom: null, // 自訂模式：{ objectiveId, eventId }，null 代表隨機抽
  features: getCampaignFeatures(null),
  missionObjective: null,
  orbit: null,
  event: null,
  budget: 0,
  rocket: null,
  parts: { power: null, comm: null, payload: null, attitude: null, structure: null },
  fuel: null,
  propellantKg: 0,
  failCount: 0,
};

function resetForNewGame() {
  gameState.features = getCampaignFeatures(gameState.campaignLevel);
  const custom = gameState.custom;
  gameState.missionObjective = custom
    ? MISSION_OBJECTIVES.find((o) => o.id === custom.objectiveId)
    : MISSION_OBJECTIVES[Math.floor(Math.random() * MISSION_OBJECTIVES.length)];
  gameState.orbit = null;
  if (custom) gameState.event = EVENTS.find((e) => e.id === custom.eventId);
  else gameState.event = gameState.features.events ? pickRandomEvent(gameState.features.forcedEventId) : null;

  gameState.rocket = null;
  gameState.parts = { power: null, comm: null, payload: null, attitude: null, structure: null };
  gameState.fuel = null;
  gameState.propellantKg = 0;

  resetBlueprintUIState();
  recomputeBudget();
}

function recomputeBudget() {
  const base = gameState.orbit ? missionBudgetM(gameState.missionObjective, gameState.orbit) : 0;
  const delta = (gameState.event && gameState.event.effect.budgetDeltaM) || 0;
  gameState.budget = base + delta;
}

// 劇情關卡還沒教推進與姿態控制時，由系統配好反應輪、依軌道選推進器並自動計算推進劑
function syncAutoPropulsion() {
  if (!gameState.features.attitude) gameState.parts.attitude = defaultAttitude();
  if (gameState.features.fuel || !gameState.orbit) return;
  gameState.fuel = defaultFuelForOrbit(gameState.orbit.id);
  gameState.propellantKg = autoPropellantKg(currentDesign());
}
