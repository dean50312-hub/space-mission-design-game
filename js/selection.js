// 選件畫面：渲染火箭與部件卡片、預算/質量計量表

function renderSelectionScreen() {
  const container = document.getElementById("selection-groups");
  container.innerHTML = "";

  container.appendChild(renderRocketGroup());
  SUBSYSTEM_KEYS.forEach((key) => {
    container.appendChild(renderSubsystemGroup(key));
  });

  updateMeters();
}

function renderRocketGroup() {
  const group = document.createElement("div");
  group.className = "part-group";

  const title = document.createElement("h3");
  title.textContent = t("selection.rocketGroup");
  group.appendChild(title);

  const cardsWrap = document.createElement("div");
  cardsWrap.className = "cards";

  ROCKETS.forEach((rocket) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "part-card";
    if (gameState.rocket && gameState.rocket.id === rocket.id) card.classList.add("selected");

    const stats = t("selection.rocketStats", {
      cost: rocket.cost,
      maxPayload: rocket.maxPayload,
      reliability: rocket.reliability,
    });

    card.innerHTML = `
      <div class="swatch swatch-rocket"></div>
      <div class="part-name">${t("rocket." + rocket.id)}</div>
      <div class="part-stats">${stats}</div>
    `;

    card.addEventListener("click", () => {
      gameState.rocket = rocket;
      renderSelectionScreen();
    });

    cardsWrap.appendChild(card);
  });

  group.appendChild(cardsWrap);
  return group;
}

function renderSubsystemGroup(key) {
  const def = SUBSYSTEMS[key];
  const group = document.createElement("div");
  group.className = "part-group";

  const title = document.createElement("h3");
  title.textContent = t("subsystem." + key);
  group.appendChild(title);

  const cardsWrap = document.createElement("div");
  cardsWrap.className = "cards";

  def.tiers.forEach((tier) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "part-card";
    if (gameState.parts[key] && gameState.parts[key].id === tier.id) card.classList.add("selected");

    const stats = t("selection.partStats", { cost: tier.cost, mass: tier.mass, value: tier.value });

    card.innerHTML = `
      <div class="swatch swatch-${key}"></div>
      <div class="part-name">${t("tier." + tier.id)}</div>
      <div class="part-stats">${stats}</div>
    `;

    card.addEventListener("click", () => {
      gameState.parts[key] = tier;
      renderSelectionScreen();
    });

    cardsWrap.appendChild(card);
  });

  group.appendChild(cardsWrap);
  return group;
}

function updateMeters() {
  const cost = currentCostUsed();
  const mass = currentMassUsed();
  const budget = gameState.budget;
  const maxPayload = gameState.rocket ? gameState.rocket.maxPayload : 0;

  document.getElementById("cost-text").textContent = `${cost} / ${budget} C`;
  document.getElementById("mass-text").textContent = gameState.rocket
    ? `${mass} / ${maxPayload} MU`
    : `${mass} / — MU`;

  const costBar = document.getElementById("cost-bar-fill");
  const massBar = document.getElementById("mass-bar-fill");

  const overBudget = isOverBudget();
  const overMass = isOverMass();

  costBar.style.width = `${Math.min(100, (cost / budget) * 100)}%`;
  costBar.classList.toggle("over", overBudget);

  const massRatio = gameState.rocket ? mass / maxPayload : 0;
  massBar.style.width = `${Math.min(100, massRatio * 100)}%`;
  massBar.classList.toggle("over", overMass);

  const warning = document.getElementById("selection-warning");
  if (overBudget || overMass) {
    warning.textContent =
      overBudget && overMass
        ? t("selection.warningBoth")
        : overBudget
        ? t("selection.warningBudget")
        : t("selection.warningMass");
    warning.classList.remove("hidden");
  } else {
    warning.classList.add("hidden");
  }

  const launchBtn = document.getElementById("launch-btn");
  launchBtn.disabled = !(isSelectionComplete() && !overBudget && !overMass);
}
