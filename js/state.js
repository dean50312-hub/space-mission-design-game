// 遊戲狀態管理

const gameState = {
  campaignLevel: null, // null = 自由遊玩（全機制開放）；1~4 = 戰役關卡
  features: getCampaignFeatures(null),
  missionObjective: null,
  orbit: null,
  event: null,
  budget: BUDGET_TOTAL,
  rocket: null,
  parts: { power: null, comm: null, science: null, structure: null },
  fuel: null,
  fuelPercent: 50,
  hazmatPurchased: false,
  incidentPenalty: 0,
  failCount: 0,
};

function resetForNewGame() {
  gameState.features = getCampaignFeatures(gameState.campaignLevel);

  gameState.missionObjective = gameState.features.orbit
    ? MISSION_OBJECTIVES[Math.floor(Math.random() * MISSION_OBJECTIVES.length)]
    : null;
  gameState.orbit = null;

  gameState.event = gameState.features.events ? pickRandomEvent(gameState.features.forcedEventId) : null;

  gameState.rocket = null;
  gameState.parts = { power: null, comm: null, science: null, structure: null };
  gameState.fuel = null;
  gameState.fuelPercent = 50;
  gameState.hazmatPurchased = false;
  gameState.incidentPenalty = 0;

  resetBlueprintUIState();
  recomputeBudget();
}

function recomputeBudget() {
  const eventDelta = gameState.event && gameState.event.effect.budgetDelta ? gameState.event.effect.budgetDelta : 0;
  const orbitDelta = gameState.orbit ? gameState.orbit.budgetDelta : 0;
  gameState.budget = BUDGET_TOTAL + eventDelta + orbitDelta;
}

function isOrbitMismatched() {
  if (!gameState.features.orbit) return false;
  if (!gameState.missionObjective || !gameState.orbit) return false;
  return gameState.orbit.id !== gameState.missionObjective.correctOrbit;
}

function fuelMass() {
  if (!gameState.fuel) return 0;
  return (FUEL_BASE_MASS_AT_FULL * gameState.fuelPercent) / 100 * gameState.fuel.massCoef;
}

function fuelCost() {
  if (!gameState.fuel) return 0;
  let cost = ((FUEL_BASE_COST_AT_FULL * gameState.fuelPercent) / 100) * gameState.fuel.costCoef;
  if (gameState.fuel.toxic && gameState.hazmatPurchased) cost += HAZMAT_COST;
  return cost;
}

function fuelPropulsionValue() {
  if (!gameState.fuel) return 0;
  let value = (FUEL_BASE_PROPULSION_AT_FULL * gameState.fuelPercent) / 100;
  if (gameState.fuel.electric && (!gameState.parts.power || gameState.parts.power.id === "economy")) {
    value *= ELECTRIC_UNDERPOWERED_MULTIPLIER;
  }
  return value;
}

function currentCostUsed() {
  let cost = gameState.rocket ? gameState.rocket.cost : 0;
  for (const key of SUBSYSTEM_KEYS) {
    if (gameState.parts[key]) cost += gameState.parts[key].cost;
  }
  cost += fuelCost();
  return cost;
}

function currentMassUsed() {
  let mass = 0;
  for (const key of SUBSYSTEM_KEYS) {
    if (gameState.parts[key]) mass += gameState.parts[key].mass;
  }
  mass += fuelMass();
  return mass;
}

function isSelectionComplete() {
  if (!gameState.rocket) return false;
  if (!SUBSYSTEM_KEYS.every((key) => gameState.parts[key] !== null)) return false;
  if (gameState.features.fuel && !gameState.fuel) return false;
  if (gameState.features.orbit && !gameState.orbit) return false;
  return true;
}

function isOverBudget() {
  return currentCostUsed() > gameState.budget;
}

function isOverMass() {
  if (!gameState.rocket) return false;
  return currentMassUsed() > gameState.rocket.maxPayload;
}
