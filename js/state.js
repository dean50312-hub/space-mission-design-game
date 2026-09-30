// 遊戲狀態管理

const gameState = {
  campaignLevel: null, // null = 自由遊玩（全機制開放）；1~4 = 戰役關卡
  features: getCampaignFeatures(null),
  missionObjective: null,
  orbit: null,
  event: null,
  budget: 0,
  rocket: null,
  parts: { power: null, comm: null, payload: null, structure: null },
  fuel: null,
  propellantKg: 0,
  failCount: 0,
};

function resetForNewGame() {
  gameState.features = getCampaignFeatures(gameState.campaignLevel);
  gameState.missionObjective = MISSION_OBJECTIVES[Math.floor(Math.random() * MISSION_OBJECTIVES.length)];
  gameState.orbit = null;
  gameState.event = gameState.features.events ? pickRandomEvent(gameState.features.forcedEventId) : null;

  gameState.rocket = null;
  gameState.parts = { power: null, comm: null, payload: null, structure: null };
  gameState.fuel = null;
  gameState.propellantKg = 0;

  resetBlueprintUIState();
  recomputeBudget();
}

function recomputeBudget() {
  const base = gameState.orbit ? MISSION_BUDGET_BY_ORBIT[gameState.orbit.id] : 0;
  const delta = (gameState.event && gameState.event.effect.budgetDeltaM) || 0;
  gameState.budget = base + delta;
}

// 劇情關卡還沒教推進系統時，由系統依軌道配好推進器並自動計算推進劑
function syncAutoPropulsion() {
  if (gameState.features.fuel || !gameState.orbit) return;
  gameState.fuel = defaultFuelForOrbit(gameState.orbit.id);
  gameState.propellantKg = autoPropellantKg(currentDesign());
}
