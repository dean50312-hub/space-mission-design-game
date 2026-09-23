// 選件畫面：渲染火箭與部件卡片、預算/質量計量表

function renderSelectionScreen() {
  const container = document.getElementById("selection-groups");
  container.innerHTML = "";

  if (gameState.features.orbit) {
    container.appendChild(renderOrbitGroup());
  }

  container.appendChild(renderRocketGroup());
  SUBSYSTEM_KEYS.forEach((key) => {
    container.appendChild(renderSubsystemGroup(key));
  });

  if (gameState.features.fuel) {
    container.appendChild(renderFuelGroup());
  }

  updateMeters();
}

function renderOrbitGroup() {
  const group = document.createElement("div");
  group.className = "part-group";

  const title = document.createElement("h3");
  title.textContent = t("selection.orbitGroup");
  group.appendChild(title);

  const cardsWrap = document.createElement("div");
  cardsWrap.className = "cards";

  ORBITS.forEach((orbit) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "part-card";
    if (gameState.orbit && gameState.orbit.id === orbit.id) card.classList.add("selected");

    const bonusNote = orbit.liftoffBonus > 0 ? t("selection.orbitLiftoffNote", { bonus: orbit.liftoffBonus }) : "";

    card.innerHTML = `
      <div class="swatch swatch-orbit"></div>
      <div class="part-name">${t("orbit." + orbit.id)}</div>
      <div class="part-stats">${t("selection.orbitStats", { budget: BUDGET_TOTAL + orbit.budgetDelta })}</div>
      ${bonusNote ? `<div class="part-stats orbit-warning">${bonusNote}</div>` : ""}
    `;

    card.addEventListener("click", () => {
      gameState.orbit = orbit;
      recomputeBudget();
      renderSelectionScreen();
    });

    cardsWrap.appendChild(card);
  });

  group.appendChild(cardsWrap);
  return group;
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
      <img class="swatch swatch-rocket" src="image/rocket/rocket-${rocket.id}.png" alt="${t("rocket." + rocket.id + ".name")}" />
      <div class="part-name">${t("rocket." + rocket.id + ".name")}</div>
      <div class="part-stats">${stats}</div>
      <div class="part-proto">${t("rocket." + rocket.id + ".proto")}</div>
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

function renderFuelGroup() {
  const group = document.createElement("div");
  group.className = "part-group";

  const title = document.createElement("h3");
  title.textContent = t("selection.fuelGroup");
  group.appendChild(title);

  const cardsWrap = document.createElement("div");
  cardsWrap.className = "cards";

  FUELS.forEach((fuel) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "part-card";
    if (gameState.fuel && gameState.fuel.id === fuel.id) card.classList.add("selected");

    const stats = t("selection.fuelStats", {
      isp: fuel.isp,
      type: fuel.electric ? t("selection.fuelTypeElectric") : t("selection.fuelTypeChemical"),
    });

    card.innerHTML = `
      <div class="swatch swatch-fuel"></div>
      <div class="part-name">${t("fuel." + fuel.id)}</div>
      <div class="part-stats">${stats}</div>
    `;

    card.addEventListener("click", () => {
      gameState.fuel = fuel;
      if (!fuel.toxic) gameState.hazmatPurchased = false;
      renderSelectionScreen();
    });

    cardsWrap.appendChild(card);
  });

  group.appendChild(cardsWrap);

  if (gameState.fuel) {
    group.appendChild(renderFuelControls());
  }

  return group;
}

function renderFuelControls() {
  const wrap = document.createElement("div");
  wrap.className = "fuel-controls";

  wrap.innerHTML = `
    <div class="meter-label"><span>${t("selection.fuelPercentLabel")}</span><span id="fuel-percent-value">${gameState.fuelPercent}%</span></div>
    <input type="range" id="fuel-percent-slider" class="fuel-slider" min="0" max="100" step="5" value="${gameState.fuelPercent}" />
    <p id="fuel-summary" class="fuel-summary"></p>
  `;

  const slider = wrap.querySelector("#fuel-percent-slider");
  slider.addEventListener("input", (e) => {
    gameState.fuelPercent = Number(e.target.value);
    document.getElementById("fuel-percent-value").textContent = `${gameState.fuelPercent}%`;
    updateFuelSummary();
    updateMeters();
  });

  if (gameState.fuel.toxic) {
    const hazmatRow = document.createElement("div");
    hazmatRow.className = "hazmat-row";
    hazmatRow.innerHTML = `
      <label class="hazmat-check">
        <input type="checkbox" id="hazmat-checkbox" ${gameState.hazmatPurchased ? "checked" : ""} />
        ${t("selection.hazmatCheckbox", { cost: HAZMAT_COST })}
      </label>
      <p class="hazmat-warning">${t("selection.hazmatWarning", {
        chance: Math.round(HAZMAT_INCIDENT_CHANCE * 100),
        penalty: HAZMAT_INCIDENT_PENALTY,
      })}</p>
    `;
    const checkbox = hazmatRow.querySelector("#hazmat-checkbox");
    checkbox.addEventListener("change", (e) => {
      gameState.hazmatPurchased = e.target.checked;
      renderSelectionScreen();
    });
    wrap.appendChild(hazmatRow);
  }

  requestAnimationFrame(updateFuelSummary);
  return wrap;
}

function updateFuelSummary() {
  const summary = document.getElementById("fuel-summary");
  if (!summary) return;
  summary.textContent = t("selection.fuelSummary", {
    mass: Math.round(fuelMass() * 10) / 10,
    cost: Math.round(fuelCost() * 10) / 10,
    propulsion: Math.round(fuelPropulsionValue()),
  });
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
