// 遊戲狀態管理

const gameState = {
  event: null,
  budget: BUDGET_TOTAL,
  rocket: null,
  parts: { power: null, comm: null, science: null, propulsion: null, structure: null },
  failCount: 0,
};

function resetForNewGame() {
  gameState.event = pickRandomEvent();
  gameState.budget = BUDGET_TOTAL + (gameState.event.effect.budgetDelta || 0);
  gameState.rocket = null;
  gameState.parts = { power: null, comm: null, science: null, propulsion: null, structure: null };
}

function currentCostUsed() {
  let cost = gameState.rocket ? gameState.rocket.cost : 0;
  for (const key of SUBSYSTEM_KEYS) {
    if (gameState.parts[key]) cost += gameState.parts[key].cost;
  }
  return cost;
}

function currentMassUsed() {
  let mass = 0;
  for (const key of SUBSYSTEM_KEYS) {
    if (gameState.parts[key]) mass += gameState.parts[key].mass;
  }
  return mass;
}

function isSelectionComplete() {
  return Boolean(gameState.rocket) && SUBSYSTEM_KEYS.every((key) => gameState.parts[key] !== null);
}

function isOverBudget() {
  return currentCostUsed() > gameState.budget;
}

function isOverMass() {
  if (!gameState.rocket) return false;
  return currentMassUsed() > gameState.rocket.maxPayload;
}
