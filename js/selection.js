// 選件畫面：火箭卡片、火箭圖紙上的部件熱點、即時任務預算表

const HOTSPOT_DEFS = [
  { key: "payload", top: 15, left: 50 },
  { key: "comm", top: 30, left: 34 },
  { key: "power", top: 47, left: 66 },
  { key: "structure", top: 63, left: 34 },
  { key: "attitude", top: 70, left: 66 },
  { key: "fuel", top: 87, left: 50 },
];

let activeHotspot = null;
let rocketPickerExpanded = true;

function resetBlueprintUIState() {
  activeHotspot = null;
  rocketPickerExpanded = true;
}

// ---------- 數字格式 ----------

function fmtNum(n, digits = 0) {
  return Number(n).toLocaleString(getLang() === "zh" ? "zh-TW" : "en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function fmtPct(ratio, digits = 0) {
  return `${fmtNum(ratio * 100, digits)}%`;
}

function fmtMoney(m) {
  return `$${fmtNum(m, m % 1 === 0 ? 0 : 1)}M`;
}

function fmtRate(mbps) {
  if (mbps >= 1000) return `${fmtNum(mbps / 1000, 1)} Gbps`;
  if (mbps >= 1) return `${fmtNum(mbps)} Mbps`;
  return `${fmtNum(mbps * 1000, 1)} kbps`;
}

function fmtPointing(deg) {
  if (deg >= UNCONTROLLED_POINTING_DEG) return t("selection.uncontrolled");
  return deg >= 1 ? `${fmtNum(deg)}°` : `${fmtNum(deg, 2)}°`;
}

function fmtDistance(m) {
  return m >= 1000 ? `${fmtNum(m / 1000, 1)} km` : m >= 1 ? `${fmtNum(m, 1)} m` : `${fmtNum(m * 100)} cm`;
}

// ---------- 畫面 ----------

function renderSelectionScreen() {
  syncAutoPropulsion();
  const container = document.getElementById("selection-groups");
  container.innerHTML = "";

  container.appendChild(renderRocketGroup());
  container.appendChild(renderBlueprintPanel());

  updateBudgetSheet();
}

function renderOrbitGroup(onSelect) {
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

    card.innerHTML = `
      <img class="swatch swatch-orbit" src="image/icons/orbit-${orbit.id}.png" alt="" />
      <div class="part-name">${t("orbit." + orbit.id)}</div>
      <div class="part-stats">${t("selection.orbitStats", {
        altitude: fmtNum(orbit.altitudeKm),
        life: orbit.designLifeYears,
        budget: fmtMoney(MISSION_BUDGET_BY_ORBIT[orbit.id]),
      })}</div>
      <div class="part-proto">${t("orbitInfo." + orbit.id)}</div>
    `;

    card.addEventListener("click", () => {
      gameState.orbit = orbit;
      recomputeBudget();
      onSelect();
    });

    cardsWrap.appendChild(card);
  });

  group.appendChild(cardsWrap);
  return group;
}

function rocketStatsText(rocket) {
  const gto = rocket.capacityKg.gto > 0 ? `${fmtNum(rocket.capacityKg.gto)} kg` : t("selection.cannotReach");
  return t("selection.rocketStats", {
    cost: fmtMoney(rocket.costM),
    leo: fmtNum(rocket.capacityKg.leo),
    gto,
    reliability: fmtPct(rocketReliability(rocket), 1),
    successes: rocket.successes,
    flights: rocket.flights,
  });
}

function renderRocketGroup() {
  const group = document.createElement("div");
  group.className = "part-group";

  const titleRow = document.createElement("div");
  titleRow.className = "part-group-title-row";

  const title = document.createElement("h3");
  title.textContent = t("selection.rocketGroup");
  titleRow.appendChild(title);

  const collapsed = Boolean(gameState.rocket) && !rocketPickerExpanded;

  if (collapsed) {
    const changeBtn = document.createElement("button");
    changeBtn.type = "button";
    changeBtn.className = "text-link-btn";
    changeBtn.textContent = t("selection.changeRocketBtn");
    changeBtn.addEventListener("click", () => {
      rocketPickerExpanded = true;
      renderSelectionScreen();
    });
    titleRow.appendChild(changeBtn);
  }

  group.appendChild(titleRow);

  if (collapsed) {
    group.appendChild(renderRocketSummary());
    return group;
  }

  const cardsWrap = document.createElement("div");
  cardsWrap.className = "cards";

  ROCKETS.forEach((rocket) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "part-card";
    if (gameState.rocket && gameState.rocket.id === rocket.id) card.classList.add("selected");
    const available = isOptionAvailable(gameState.event, "rocket", rocket);

    card.innerHTML = `
      <img class="swatch swatch-rocket" src="image/rocket/rocket-${rocket.id}.png" alt="${t("rocket." + rocket.id + ".name")}" />
      <div class="part-name">${t("rocket." + rocket.id + ".name")}</div>
      ${unavailableTag(available)}
      <div class="part-stats">${rocketStatsText(rocket)}</div>
      <div class="part-proto">${t("rocket." + rocket.id + ".proto")}</div>
    `;
    if (!available) {
      card.disabled = true;
      card.classList.add("unavailable");
    }

    card.addEventListener("click", () => {
      gameState.rocket = rocket;
      rocketPickerExpanded = false;
      renderSelectionScreen();
    });

    cardsWrap.appendChild(card);
  });

  group.appendChild(cardsWrap);
  return group;
}

function renderRocketSummary() {
  const rocket = gameState.rocket;
  const bar = document.createElement("div");
  bar.className = "rocket-summary";

  bar.innerHTML = `
    <img class="rocket-summary-img" src="image/rocket/rocket-${rocket.id}.png" alt="${t("rocket." + rocket.id + ".name")}" />
    <div class="rocket-summary-text">
      <div class="part-name">${t("rocket." + rocket.id + ".name")}</div>
      <div class="part-stats">${rocketStatsText(rocket)}</div>
    </div>
  `;

  return bar;
}

function unavailableTag(available) {
  if (available) return "";
  return `<div class="unavailable-tag">${glyph("ban")}${t("selection.unavailable", { event: t("event." + gameState.event.id + ".name") })}</div>`;
}

function hotspotLabel(key) {
  if (key === "fuel") return t("selection.fuelGroup");
  if (key === "payload") return t("payloadKind." + gameState.missionObjective.payloadKind);
  return t("subsystem." + key);
}

function partImageSrc(key, tierId) {
  if (key === "payload") return `image/parts/payload-${gameState.missionObjective.payloadKind}-${tierId}.png`;
  return `image/parts/${key}-${tierId}.png`;
}

const EMPTY_HOTSPOT_ICON = `<img class="hotspot-icon-img empty" src="image/icons/glyph-add.png" alt="" />`;

// 句子裡的小圖示（image/icons/glyph-*.png）
function glyph(name) {
  return `<img class="glyph" src="image/icons/glyph-${name}.png" alt="" />`;
}

function hotspotIconMarkup(h) {
  if (h.key === "fuel") {
    if (gameState.fuel) return `<img class="hotspot-icon-img" src="image/parts/fuel-${gameState.fuel.id}.png" alt="" />`;
    return EMPTY_HOTSPOT_ICON;
  }
  const tier = gameState.parts[h.key];
  if (tier) return `<img class="hotspot-icon-img" src="${partImageSrc(h.key, tier.id)}" alt="" />`;
  return EMPTY_HOTSPOT_ICON;
}

function isHotspotFilled(key) {
  return key === "fuel" ? Boolean(gameState.fuel) : Boolean(gameState.parts[key]);
}

function renderBlueprintPanel() {
  const wrap = document.createElement("div");
  wrap.className = "blueprint-panel";

  const title = document.createElement("h3");
  title.textContent = t("selection.blueprintTitle");
  wrap.appendChild(title);

  const body = document.createElement("div");
  body.className = "blueprint-body";

  if (!gameState.rocket) {
    const hint = document.createElement("p");
    hint.className = "blueprint-hint";
    hint.textContent = t("selection.blueprintHint");
    body.appendChild(hint);
  } else {
    body.appendChild(renderBlueprintFrame());
    if (activeHotspot) body.appendChild(renderHotspotDetail(activeHotspot));
  }

  const sheet = document.createElement("aside");
  sheet.id = "budget-sheet";
  sheet.className = "budget-sheet panel";
  body.appendChild(sheet);

  wrap.appendChild(body);
  return wrap;
}

function renderBlueprintFrame() {
  const frame = document.createElement("div");
  frame.className = "blueprint-frame";

  const img = document.createElement("img");
  img.className = "blueprint-img";
  img.src = `image/rocket/blueprint-${gameState.rocket.id}.png`;
  img.alt = t("rocket." + gameState.rocket.id + ".name");
  frame.appendChild(img);

  HOTSPOT_DEFS.filter((h) => gameState.features[h.key] !== false).forEach((h) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "hotspot";
    btn.style.top = h.top + "%";
    btn.style.left = h.left + "%";
    if (isHotspotFilled(h.key)) btn.classList.add("selected");
    if (activeHotspot === h.key) btn.classList.add("active");

    btn.innerHTML = `
      ${hotspotIconMarkup(h)}
      <span class="hotspot-label">${hotspotLabel(h.key)}</span>
    `;

    btn.addEventListener("click", () => {
      activeHotspot = activeHotspot === h.key ? null : h.key;
      renderSelectionScreen();
    });

    frame.appendChild(btn);
  });

  return frame;
}

function renderHotspotDetail(key) {
  const detail = document.createElement("div");
  detail.className = "blueprint-detail panel";

  const header = document.createElement("div");
  header.className = "blueprint-detail-header";

  const heading = document.createElement("h4");
  heading.textContent = hotspotLabel(key);
  header.appendChild(heading);

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "blueprint-detail-close";
  closeBtn.textContent = "×";
  closeBtn.setAttribute("aria-label", t("selection.blueprintCloseBtn"));
  closeBtn.addEventListener("click", () => {
    activeHotspot = null;
    renderSelectionScreen();
  });
  header.appendChild(closeBtn);

  detail.appendChild(header);

  const explainer = document.createElement("p");
  explainer.className = "detail-explainer";
  explainer.textContent = t("explainer." + (key === "payload" ? "payload_" + gameState.missionObjective.payloadKind : key));
  detail.appendChild(explainer);

  detail.appendChild(key === "fuel" ? renderFuelCards() : renderSubsystemCards(key));
  return detail;
}

function gradeLabel(grade) {
  return t("grade." + grade);
}

function partStatsText(key, tier) {
  const orbit = gameState.orbit;
  const common = { cost: fmtMoney(tier.costM), grade: gradeLabel(tier.grade) };
  if (key === "power") {
    return t("selection.powerStats", { ...common, watts: fmtNum(tier.powerW), mass: fmtNum(tier.massKg) }) +
      (tier.deployables ? ` · ${t("selection.deployTag")}` : "");
  }
  if (key === "comm") {
    return t("selection.commStats", {
      ...common,
      rate: fmtRate(tier.rateMbps[orbit.id]),
      orbit: t("orbitShort." + orbit.id),
      watts: fmtNum(tier.powerW),
      mass: fmtNum(tier.massKg),
    }) + (tier.deployables ? ` · ${t("selection.deployTag")}` : "");
  }
  if (key === "structure") {
    return t("selection.structureStats", { ...common, fraction: fmtNum(tier.massFraction * 100) });
  }
  if (key === "attitude") {
    const achieved = achievedPointingDeg(tier, orbit);
    return t("selection.attitudeStats", { ...common, pointing: fmtPointing(achieved), watts: fmtNum(tier.powerW), mass: fmtNum(tier.massKg) }) +
      (tier.magnetic && orbit.id === "geo" ? `<br>${glyph("warn")}${t("selection.geoTorquerTag")}` : "");
  }
  if (gameState.missionObjective.payloadKind === "transponder") {
    return t("selection.transponderStats", { ...common, gbps: fmtNum(tier.throughputGbps), watts: fmtNum(tier.powerW), mass: fmtNum(tier.massKg) });
  }
  return t("selection.opticalStats", {
    ...common,
    aperture: fmtNum(tier.apertureM * 100),
    bands: tier.bands,
    gsd: fmtDistance(groundSampleDistanceM(tier.apertureM, orbit.altitudeKm)),
    watts: fmtNum(tier.powerW),
    mass: fmtNum(tier.massKg),
  });
}

function partProtoText(key, tier) {
  if (key === "payload") return t(`partProto.payload_${gameState.missionObjective.payloadKind}.${tier.id}`);
  return t(`partProto.${key}.${tier.id}`);
}

function renderSubsystemCards(key) {
  const options = key === "payload" ? payloadOptionsFor(gameState.missionObjective) : SUBSYSTEMS[key];
  const cardsWrap = document.createElement("div");
  cardsWrap.className = "cards";

  options.forEach((tier) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "part-card";
    if (gameState.parts[key] === tier) card.classList.add("selected");
    const available = isOptionAvailable(gameState.event, key, tier);

    card.innerHTML = `
      <img class="swatch swatch-part" src="${partImageSrc(key, tier.id)}" alt="${t("tier." + tier.id)}" />
      <div class="part-name">${t("tier." + tier.id)}</div>
      ${unavailableTag(available)}
      <div class="part-stats">${partStatsText(key, tier)}</div>
      <div class="part-proto">${partProtoText(key, tier)}</div>
    `;
    if (!available) {
      card.disabled = true;
      card.classList.add("unavailable");
    }

    card.addEventListener("click", () => {
      gameState.parts[key] = tier;
      activeHotspot = null;
      renderSelectionScreen();
    });

    cardsWrap.appendChild(card);
  });

  return cardsWrap;
}

function fuelStatsText(fuel) {
  const type = fuel.electric
    ? t("selection.fuelTypeElectric", { watts: fmtNum(fuel.powerW) })
    : t("selection.fuelTypeChemical");
  return t("selection.fuelStats", { isp: fmtNum(fuel.isp), type, mass: fuel.dryMassKg, cost: fmtMoney(fuel.costM) }) +
    (fuel.toxic ? ` · ${t("selection.toxicTag", { cost: fmtMoney(TOXIC_HANDLING_COST_M) })}` : "");
}

function renderFuelCards() {
  const wrap = document.createElement("div");

  const cardsWrap = document.createElement("div");
  cardsWrap.className = "cards";

  FUELS.forEach((fuel) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "part-card";
    if (gameState.fuel === fuel) card.classList.add("selected");

    card.innerHTML = `
      <img class="swatch swatch-part" src="image/parts/fuel-${fuel.id}.png" alt="${t("fuel." + fuel.id)}" />
      <div class="part-name">${t("fuel." + fuel.id)}</div>
      <div class="part-stats">${fuelStatsText(fuel)}</div>
      <div class="part-proto">${t("partProto.fuel." + fuel.id)}</div>
    `;

    card.addEventListener("click", () => {
      const firstPick = !gameState.fuel;
      gameState.fuel = fuel;
      if (firstPick) gameState.propellantKg = autoPropellantKg(currentDesign());
      renderSelectionScreen();
    });

    cardsWrap.appendChild(card);
  });

  wrap.appendChild(cardsWrap);
  if (gameState.fuel) wrap.appendChild(renderPropellantControls());
  return wrap;
}

function renderPropellantControls() {
  const wrap = document.createElement("div");
  wrap.className = "fuel-controls";

  wrap.innerHTML = `
    <div class="meter-label"><span>${t("selection.propellantLabel")}</span><span id="propellant-value"></span></div>
    <input type="range" id="propellant-slider" class="fuel-slider" min="0" max="${PROPELLANT_MAX_KG}" step="${PROPELLANT_STEP_KG}" value="${gameState.propellantKg}" />
    <p id="propellant-summary" class="fuel-summary"></p>
    <button type="button" id="propellant-auto-btn" class="text-link-btn">${t("selection.propellantAutoBtn", { margin: fmtPct(AUTO_PROPELLANT_MARGIN) })}</button>
    <p class="detail-explainer">${t("explainer.rocketEquation")}</p>
  `;

  wrap.querySelector("#propellant-slider").addEventListener("input", (e) => {
    gameState.propellantKg = Number(e.target.value);
    updateBudgetSheet();
  });
  wrap.querySelector("#propellant-auto-btn").addEventListener("click", () => {
    gameState.propellantKg = autoPropellantKg(currentDesign());
    wrap.querySelector("#propellant-slider").value = gameState.propellantKg;
    updateBudgetSheet();
  });

  return wrap;
}

function updatePropellantReadout(analysis) {
  const valueEl = document.getElementById("propellant-value");
  if (!valueEl) return;
  valueEl.textContent = `${fmtNum(gameState.propellantKg)} kg`;
  const summary = document.getElementById("propellant-summary");
  summary.textContent = t("selection.propellantSummary", {
    dv: fmtNum(analysis.dv, 2),
    required: fmtNum(analysis.dvRequired.total, 2),
    fraction: fmtPct(gameState.propellantKg / Math.max(analysis.wetKg, 1)),
  });
  summary.classList.toggle("short", analysis.dv < analysis.dvRequired.total);
}

// ---------- 任務預算表 ----------

function sheetLine({ icon, labelKey, valueText, ratio, status, explainKey, explainParams }) {
  const pct = Math.max(0, Math.min(100, ratio * 100));
  return `
    <details class="sheet-line ${status}" data-key="${labelKey}">
      <summary>
        <span class="sheet-label">${glyph(icon)}${t(labelKey)}</span>
        <span class="sheet-value">${valueText}</span>
        <span class="sheet-bar"><span class="sheet-bar-fill" style="width:${pct}%"></span></span>
      </summary>
      <p class="sheet-explain">${t(explainKey, explainParams)}</p>
    </details>
  `;
}

function statusForLimit(used, limit) {
  if (limit <= 0) return "bad";
  const r = used / limit;
  return r > 1 ? "bad" : r > 0.9 ? "warn" : "ok";
}

function statusForSupply(have, need) {
  if (need <= 0) return "ok";
  const r = have / need;
  return r >= 1 ? "ok" : r >= 0.7 ? "warn" : "bad";
}

function renderBudgetLines(analysis) {
  const orbit = gameState.orbit;
  const lines = [];

  lines.push(sheetLine({
    icon: "cost",
    labelKey: "sheet.cost",
    valueText: `${fmtMoney(analysis.costM)} / ${fmtMoney(analysis.budgetM)}`,
    ratio: analysis.costM / analysis.budgetM,
    status: statusForLimit(analysis.costM, analysis.budgetM),
    explainKey: "sheetExplain.cost",
  }));

  if (gameState.rocket) {
    lines.push(sheetLine({
      icon: "mass",
      labelKey: "sheet.mass",
      valueText: analysis.capacityKg > 0
        ? `${fmtNum(analysis.wetKg)} / ${fmtNum(analysis.capacityKg)} kg`
        : t("sheet.noCapacity"),
      ratio: analysis.capacityKg > 0 ? analysis.wetKg / analysis.capacityKg : 1,
      status: statusForLimit(analysis.wetKg, analysis.capacityKg),
      explainKey: "sheetExplain.mass",
      explainParams: { dry: fmtNum(analysis.dryKg), dest: t("orbitDest." + orbit.id) },
    }));
  }

  if (gameState.parts.power) {
    lines.push(sheetLine({
      icon: "power",
      labelKey: "sheet.power",
      valueText: `${fmtNum(analysis.powerAvailW)} / ${fmtNum(analysis.powerLoadW)} W`,
      ratio: analysis.powerAvailW / Math.max(analysis.powerLoadW, 1),
      status: statusForSupply(analysis.powerAvailW, analysis.powerLoadW),
      explainKey: "sheetExplain.power_" + orbit.id,
      explainParams: { factor: fmtPct(orbit.sunlightFactor) },
    }));
  }

  if (analysis.thermal) {
    const th = analysis.thermal;
    lines.push(sheetLine({
      icon: "thermal",
      labelKey: "sheet.thermal",
      valueText: t("sheet.thermalValue", { area: fmtNum(th.radiatorM2, 1), method: t("thermalMethod." + th.method) }),
      ratio: th.heatW / 12000,
      status: th.method === "passive" ? "ok" : "warn",
      explainKey: "sheetExplain.thermal",
      explainParams: { watts: fmtNum(th.heatW), area: fmtNum(th.radiatorM2, 1), flux: RADIATOR_NET_FLUX_W_M2[orbit.id], method: t("thermalMethod." + th.method) },
    }));
  }

  if (analysis.dataGenGbit !== undefined && analysis.dataDownGbit !== undefined) {
    lines.push(sheetLine({
      icon: "data",
      labelKey: "sheet.data",
      valueText: `${fmtNum(analysis.dataDownGbit, analysis.dataDownGbit < 10 ? 1 : 0)} / ${fmtNum(analysis.dataGenGbit)} Gbit`,
      ratio: analysis.dataDownGbit / analysis.dataGenGbit,
      status: statusForSupply(analysis.dataDownGbit, analysis.dataGenGbit),
      explainKey: "sheetExplain.data_" + orbit.id,
    }));
  }

  if (gameState.features.operations) {
    const reserve = Math.max(0, analysis.budgetM - analysis.costM);
    const extensionYears = Math.min(reserve / EXTENDED_MISSION_COST_PER_YEAR_M, orbit.designLifeYears * EXTENSION_MAX_FRACTION);
    lines.push(sheetLine({
      icon: "reserve",
      labelKey: "sheet.reserve",
      valueText: fmtMoney(Math.round(reserve * 10) / 10),
      ratio: reserve / analysis.budgetM,
      status: "ok",
      explainKey: "sheetExplain.reserve",
      explainParams: { perYear: fmtMoney(EXTENDED_MISSION_COST_PER_YEAR_M), years: fmtNum(extensionYears, 1) },
    }));
  }

  if (gameState.fuel && analysis.dvRequired) {
    lines.push(sheetLine({
      icon: "dv",
      labelKey: "sheet.dv",
      valueText: `${fmtNum(analysis.dv, 2)} / ${fmtNum(analysis.dvRequired.total, 2)} km/s`,
      ratio: analysis.dv / analysis.dvRequired.total,
      status: analysis.dvRequired.insert > 0 && analysis.dv < analysis.dvRequired.insert
        ? "bad"
        : statusForSupply(analysis.dv, analysis.dvRequired.total),
      explainKey: "sheetExplain.dv_" + orbit.id + (gameState.fuel.electric && orbit.id === "geo" ? "_electric" : ""),
      explainParams: { insert: fmtNum(analysis.dvRequired.insert, 2), ops: fmtNum(analysis.dvRequired.ops, 2) },
    }));
  }

  return lines.join("");
}

function renderFactorRows(analysis) {
  const keys = ["coverage", "performance", "delivery", "power", "pointing", "lifetime"];
  return keys
    .map((key) => {
      const v = analysis.factors[key];
      const status = v >= 0.9 ? "ok" : v >= 0.5 ? "warn" : "bad";
      return `
        <details class="factor-row ${status}" data-key="factor.${key}">
          <summary><span>${t("factor." + key)}</span><span>${fmtPct(v)}</span></summary>
          <p class="sheet-explain">${factorExplanation(key, analysis)}</p>
        </details>`;
    })
    .join("");
}

function factorExplanation(key, analysis) {
  const objective = gameState.missionObjective;
  const orbit = gameState.orbit;
  if (key === "coverage") return t(`coverageExplain.${objective.id}.${orbit.id}`);
  if (key === "performance") {
    const req = objective.requirement;
    if (req.type === "throughput") {
      return t("factorExplain.throughput", { have: fmtNum(gameState.parts.payload.throughputGbps), need: req.gbps });
    }
    if (req.type === "resolution") {
      return t("factorExplain.resolution", { have: fmtDistance(analysis.gsdM), need: fmtDistance(req.maxGsdM) });
    }
    return t("factorExplain.bands", {
      have: gameState.parts.payload.bands,
      need: req.bands,
      gsd: fmtDistance(analysis.gsdM),
      maxGsd: fmtDistance(req.maxGsdM),
    });
  }
  if (key === "delivery") {
    return objective.payloadKind === "transponder" ? t("factorExplain.deliveryTransponder") : t("factorExplain.delivery");
  }
  if (key === "power") return t("factorExplain.power");
  if (key === "pointing") {
    const attitude = gameState.parts.attitude;
    if (attitude.magnetic && orbit.id === "geo") {
      return t("factorExplain.pointingGeoTorquer", { ratio: fmtNum(magneticFieldWeakening(orbit.altitudeKm)) });
    }
    return t("factorExplain.pointing", { have: fmtPointing(analysis.pointingDeg), need: fmtPointing(objective.pointingDeg) });
  }
  if (analysis.stranded) return t("factorExplain.stranded");
  const parts = [t("factorExplain.lifetime", { pct: fmtPct(analysis.dvLifeFactor) })];
  if (analysis.transferYears > 0) {
    parts.push(t("factorExplain.transferDelay", { months: fmtNum(analysis.transferYears * 12) }));
  }
  return parts.join(" ");
}

function renderReliabilityRows(analysis) {
  const rel = analysis.reliability;
  const rows = [
    { key: "launch", value: rel.launch, params: { rocket: fmtPct(rel.rocket, 1) } },
    { key: "deploy", value: rel.deploy, params: {} },
    {
      key: gameState.features.operations ? "opsNoAnomaly" : "ops",
      value: rel.surviveBelts * rel.surviveLife * (1 - rel.impactRisk),
      params: { years: fmtNum(gameState.orbit.designLifeYears), share: fmtPct(RECOVERABLE_ANOMALY_SHARE) },
    },
  ];
  return rows
    .map(
      (row) => `
      <details class="factor-row" data-key="reliability.${row.key}">
        <summary><span>${t("reliability." + row.key, row.params)}</span><span>${fmtPct(row.value, 1)}</span></summary>
        <p class="sheet-explain">${t("reliabilityExplain." + row.key, row.params)}</p>
      </details>`
    )
    .join("");
}

function updateBudgetSheet() {
  syncAutoPropulsion();
  const design = currentDesign();
  const analysis = analyzeDesign(design);
  const sheet = document.getElementById("budget-sheet");

  if (sheet) {
    const openKeys = new Set([...sheet.querySelectorAll("details[open]")].map((d) => d.dataset.key));
    const expectedValue = analysis.complete ? computeExpectedValue(design, gameState.features, analysis) : 0;
    const methodNote = gameState.features.operations
      ? `<div class="sheet-sub">${t("sheet.monteCarloNote", { runs: fmtNum(EV_SIMULATION_RUNS) })}</div>`
      : "";
    const headline = analysis.complete
      ? `
        <div class="sheet-headline">
          <div class="sheet-ev"><span class="sheet-ev-label">${t("sheet.expectedValue")}</span><span class="sheet-ev-number">${fmtPct(expectedValue)}</span></div>
          <div class="sheet-sub">${t("sheet.fullSuccess", { pct: fmtPct(analysis.fullSuccess) })}</div>
          ${methodNote}
        </div>`
      : `<div class="sheet-headline pending">${t("sheet.pending")}</div>`;

    sheet.innerHTML = `
      <h4 class="sheet-title">${t("sheet.title")}</h4>
      ${headline}
      <div class="sheet-section">${renderBudgetLines(analysis)}</div>
      ${analysis.complete ? `
        <h5 class="sheet-subtitle">${t("sheet.valueBreakdown")}</h5>
        <div class="sheet-section">${renderFactorRows(analysis)}</div>
        <h5 class="sheet-subtitle">${t("sheet.reliability")}</h5>
        <div class="sheet-section">${renderReliabilityRows(analysis)}</div>` : ""}
    `;
    sheet.querySelectorAll("details").forEach((d) => {
      if (openKeys.has(d.dataset.key)) d.open = true;
    });
  }

  if (gameState.fuel && analysis.dvRequired) updatePropellantReadout(analysis);

  const warning = document.getElementById("selection-warning");
  const messages = [];
  if (analysis.overBudget) messages.push(t("selection.warningBudget"));
  if (analysis.noCapacity) messages.push(t("selection.warningNoCapacity", { rocket: t("rocket." + gameState.rocket.id + ".name") }));
  else if (analysis.overMass) messages.push(t("selection.warningMass"));
  warning.textContent = messages.join(" ");
  warning.classList.toggle("hidden", messages.length === 0);

  document.getElementById("launch-btn").disabled = isLaunchBlocked(analysis);
}
