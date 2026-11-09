// 選件畫面：火箭卡片、衛星設計圖上的部件熱點、即時任務預算表

// 熱點放在零件的真實位置（對照 tools/sat-art.py 畫的設計圖，地球在畫面下方）：
// 推進器噴嘴在背向地球的頂面、太陽能板在兩翼、通訊天線與酬載朝向地球
// label：引線標註放在設計圖左側或右側的哪個高度（%），標籤和零件之間畫一條細線
const HOTSPOT_DEFS = [
  { key: "fuel", top: 16, left: 50, label: { side: "right", y: 6 } },
  { key: "attitude", top: 42, left: 59, label: { side: "right", y: 30 } },
  { key: "structure", top: 57, left: 40, label: { side: "left", y: 50 } },
  { key: "computer", top: 35, left: 33, label: { side: "left", y: 21 } },
  { key: "power", top: 49, left: 87, label: { side: "right", y: 67 } },
  { key: "comm", top: 79, left: 27, label: { side: "left", y: 92 } },
  { key: "payload", top: 78, left: 55, label: { side: "right", y: 89 } },
];
const CALLOUT_EDGE = { left: 28, right: 72 };

// 推進劑滑桿的上限跟著設計走：自動計算量的 3 倍，自動計算的位置大約在滑桿 1/3 處
const PROPELLANT_SLIDER_AUTO_MULTIPLE = 3;
const PROPELLANT_SLIDER_MIN_KG = 50;

let activeHotspot = null;
let rocketPickerExpanded = true;

function resetBlueprintUIState() {
  activeHotspot = null;
  rocketPickerExpanded = true;
}

// ---------- 數字格式 ----------

function fmtNum(n, digits = 0) {
  return Number(n).toLocaleString("en-US", {
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

// 句子之間的空白（原本中文版不加空白，英文版要）
function sentenceGap() {
  return " ";
}

function fmtDistance(m) {
  return m >= 1000 ? `${fmtNum(m / 1000, 1)} km` : m >= 1 ? `${fmtNum(m, 1)} m` : `${fmtNum(m * 100)} cm`;
}

// ---------- 任務狀態列：簡報、設計、發射、報告畫面頂端，隨時看得到任務、軌道、事件、火箭和預算 ----------

function hudMeter(label, used, limit, text) {
  const ratio = limit > 0 ? used / limit : 0;
  const status = ratio > 1 ? "bad" : ratio > 0.9 ? "warn" : "ok";
  return `
    <div class="hud-cell hud-meter ${status}">
      <span class="hud-label">${label}</span>
      <span class="hud-value">${text}</span>
      <span class="hud-bar"><span style="width:${Math.min(100, ratio * 100)}%"></span></span>
    </div>`;
}

function renderMissionHud() {
  const objective = gameState.missionObjective;
  if (!objective) return;
  const design = currentDesign();
  const analysis = analyzeDesign(design);
  const cell = (label, value, extra = "") => `<div class="hud-cell${extra}"><span class="hud-label">${label}</span><span class="hud-value">${value}</span></div>`;
  const html = `
    <div class="hud-cell hud-mission">
      <img src="image/icons/objective-${objective.id}.png" alt="" />
      <div><span class="hud-label">${t("hud.mission")}</span><span class="hud-value">${t("objective." + objective.id + ".short")}</span></div>
    </div>
    ${cell(t("hud.orbit"), gameState.orbit ? t("orbitShort." + gameState.orbit.id) : "—")}
    ${gameState.event ? cell(t("hud.event"), t("event." + gameState.event.id + ".name"), gameState.event.id === "nominal" ? "" : " hud-alert") : ""}
    ${cell(t("hud.rocket"), gameState.rocket ? t("rocket." + gameState.rocket.id + ".name").replace(/ \(.*\)$/, "") : "—")}
    ${gameState.orbit ? hudMeter(t("hud.budget"), analysis.costM, analysis.budgetM, `${fmtMoney(Math.round(analysis.costM * 10) / 10)} / ${fmtMoney(analysis.budgetM)}`) : ""}
    ${gameState.rocket && analysis.capacityKg > 0 ? hudMeter(t("hud.mass"), analysis.wetKg, analysis.capacityKg, `${fmtNum(Math.round(analysis.wetKg))} / ${fmtNum(analysis.capacityKg)} kg`) : ""}`;
  document.querySelectorAll(".mission-hud").forEach((el) => {
    el.innerHTML = html;
  });
}

// ---------- 畫面 ----------

function renderSelectionScreen() {
  syncAutoPropulsion();
  renderSelectionBrief();
  const container = document.getElementById("selection-groups");
  container.innerHTML = "";

  container.appendChild(renderRocketGroup());
  container.appendChild(renderBlueprintPanel());

  updateBudgetSheet();
}

// 設計畫面最上方再列一次任務需求，選零件時不用回簡報查
function renderSelectionBrief() {
  const objective = gameState.missionObjective;
  document.getElementById("selection-brief").innerHTML = `
    <img class="selection-brief-icon" src="image/icons/objective-${objective.id}.png" alt="" />
    <div>
      <div class="selection-brief-name">${t("objective." + objective.id + ".short")} · ${t("orbit." + gameState.orbit.id)}</div>
      <div class="selection-brief-req">${t("objective." + objective.id + ".req")}</div>
    </div>`;
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
        budget: fmtMoney(missionBudgetM(gameState.missionObjective, orbit)),
      })}</div>
      <div class="part-proto">${t("brief.orbit." + orbit.id)} ${codexLinkHtml("orbits", "orbits-" + orbit.id)}</div>
    `;

    if (MP.active && !mpCanEdit("orbit")) card.classList.add("mp-locked");

    card.addEventListener("click", () => {
      if (MP.active) {
        if (mpTryEdit("orbit")) mpSetDesign({ orbit: orbit.id });
        return;
      }
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
      <div class="part-proto">${t("brief.rocket." + rocket.id)} ${codexLinkHtml("rockets", "rockets-" + rocket.id)}</div>
    `;
    if (!available) {
      card.disabled = true;
      card.classList.add("unavailable");
    }

    if (MP.active && !mpCanEdit("rocket")) card.classList.add("mp-locked");

    card.addEventListener("click", () => {
      if (MP.active) {
        if (mpTryEdit("rocket")) mpSetDesign({ rocket: rocket.id });
        return;
      }
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
  // 整條都能點：玩家想換火箭時，直覺會點火箭本身
  const bar = document.createElement("button");
  bar.type = "button";
  bar.className = "rocket-summary";

  bar.innerHTML = `
    <img class="rocket-summary-img" src="image/rocket/rocket-${rocket.id}.png" alt="${t("rocket." + rocket.id + ".name")}" />
    <div class="rocket-summary-text">
      <div class="part-name">${t("rocket." + rocket.id + ".name")}</div>
      <div class="part-stats">${rocketStatsText(rocket)}</div>
    </div>
    <span class="rocket-summary-change">${t("selection.changeRocketBtn")}</span>
  `;
  bar.addEventListener("click", () => {
    rocketPickerExpanded = true;
    renderSelectionScreen();
  });

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

// 零件等級的名稱：衛星電腦三種各有長處，不用「經濟／標準／高階」
function tierLabel(key, tierId) {
  return key === "computer" ? t("computerTier." + tierId) : t("tier." + tierId);
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

// 子系統檢查清單：每個零件位置的狀態燈（已選綠燈、未選黃燈），點一下就打開那個零件的選單
function renderSystemsChecklist() {
  const panel = document.createElement("div");
  panel.className = "systems-checklist panel";
  const defs = HOTSPOT_DEFS.filter((h) => gameState.features[h.key] !== false);
  const ready = defs.filter((h) => isHotspotFilled(h.key)).length;
  panel.innerHTML = `
    <div class="console-head"><span class="led${ready === defs.length ? " led-ok" : ""}"></span>${t("selection.systemsTitle")}<span class="console-clock">${ready}/${defs.length}</span></div>
    <p class="detail-explainer">${t("selection.systemsHint")}</p>`;
  const list = document.createElement("div");
  list.className = "systems-list";
  defs.forEach((h) => {
    const filled = isHotspotFilled(h.key);
    const value = h.key === "fuel"
      ? (gameState.fuel ? t("fuel." + gameState.fuel.id) : t("selection.systemEmpty"))
      : (gameState.parts[h.key] ? tierLabel(h.key, gameState.parts[h.key].id) : t("selection.systemEmpty"));
    const row = document.createElement("button");
    row.type = "button";
    row.className = "systems-row" + (filled ? " ok" : "");
    row.innerHTML = `<span class="led${filled ? " led-ok" : " led-warn"}"></span><span class="systems-name">${hotspotLabel(h.key)}</span><span class="systems-value">${value}</span>`;
    row.addEventListener("click", () => {
      activeHotspot = h.key;
      renderSelectionScreen();
    });
    list.appendChild(row);
  });
  panel.appendChild(list);
  return panel;
}

function renderBlueprintPanel() {
  const wrap = document.createElement("div");
  wrap.className = "blueprint-panel";

  const title = document.createElement("h3");
  title.textContent = t("selection.blueprintTitle");
  wrap.appendChild(title);

  const body = document.createElement("div");
  body.className = "blueprint-body";

  body.appendChild(renderBlueprintFrame());
  body.appendChild(activeHotspot ? renderHotspotDetail(activeHotspot) : renderSystemsChecklist());

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

  const kind = gameState.missionObjective.payloadKind;
  const img = document.createElement("img");
  img.className = "blueprint-img";
  img.src = `image/rocket/blueprint-sat-${kind}.png`;
  img.alt = t("selection.blueprintTitle");
  frame.appendChild(img);

  const earth = document.createElement("span");
  earth.className = "blueprint-note blueprint-earth";
  earth.textContent = t("selection.earthDirection");
  frame.appendChild(earth);
  if (kind === "plasma") {
    const ram = document.createElement("span");
    ram.className = "blueprint-note blueprint-ram";
    ram.textContent = t("selection.flightDirection");
    frame.appendChild(ram);
  }

  const defs = HOTSPOT_DEFS.filter((h) => gameState.features[h.key] !== false);
  const lines = defs.map((h) =>
    `<line x1="${h.left}" y1="${h.top}" x2="${CALLOUT_EDGE[h.label.side]}" y2="${h.label.y}" class="${activeHotspot === h.key ? "active" : ""}" />`).join("");
  frame.insertAdjacentHTML("beforeend", `<svg class="callout-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${lines}</svg>`);

  defs.forEach((h) => {
    const callout = document.createElement("button");
    callout.type = "button";
    callout.className = `callout callout-${h.label.side}` + (isHotspotFilled(h.key) ? " filled" : "") + (activeHotspot === h.key ? " active" : "");
    callout.style.top = h.label.y + "%";
    const value = h.key === "fuel"
      ? (gameState.fuel ? t("fuel." + gameState.fuel.id) : t("selection.systemEmpty"))
      : (gameState.parts[h.key] ? tierLabel(h.key, gameState.parts[h.key].id) : t("selection.systemEmpty"));
    callout.innerHTML = `<span class="callout-name">${hotspotLabel(h.key)}</span><span class="callout-value">${value}</span>`;
    callout.addEventListener("click", () => {
      activeHotspot = activeHotspot === h.key ? null : h.key;
      renderSelectionScreen();
    });
    frame.appendChild(callout);
  });

  defs.forEach((h) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "hotspot";
    btn.setAttribute("aria-label", hotspotLabel(h.key));
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

  if (MP.active) {
    const owner = document.createElement("p");
    owner.className = "mp-owner";
    owner.innerHTML = mpOwnerText(key);
    detail.appendChild(owner);
  }

  const group = partGroupKey(key);
  const explainer = document.createElement("p");
  explainer.className = "detail-explainer";
  explainer.innerHTML = `${t("brief.explainer." + group)} ${codexLinkHtml("parts", "parts-" + group)}`;
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
    // 太陽能板依目前的設計自動定大小，所以卡片上的規格會跟著其他零件改變
    const spec = powerSystemSpec({ ...currentDesign(), parts: { ...gameState.parts, power: tier } });
    return t("selection.powerStats", {
      grade: gradeLabel(tier.grade),
      cost: fmtMoney(spec.costM),
      watts: fmtNum(spec.ratedW),
      mass: fmtNum(spec.massKg),
      wPerKg: tier.wPerKg,
    }) +
      (tier.deployables ? ` · ${t("selection.deployTag")}` : "") +
      (spec.capped ? `<br>${glyph("warn")}${t("selection.powerCapped", { max: fmtNum(tier.maxRatedW), need: fmtNum(spec.requiredW) })}` : "");
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
  if (key === "computer") {
    return t("selection.computerStats", { ...common, data: fmtNum(tier.dataGbitPerDay), watts: fmtNum(tier.powerW), mass: fmtNum(tier.massKg, tier.massKg < 1 ? 1 : 0) });
  }
  if (key === "attitude") {
    const achieved = achievedPointingDeg(tier, orbit);
    return t("selection.attitudeStats", { ...common, pointing: fmtPointing(achieved), watts: fmtNum(tier.powerW), mass: fmtNum(tier.massKg) }) +
      (tier.magnetic && orbit.id === "geo" ? `<br>${glyph("warn")}${t("selection.geoTorquerTag")}` : "");
  }
  if (gameState.missionObjective.payloadKind === "transponder") {
    return t("selection.transponderStats", { ...common, gbps: fmtNum(tier.throughputGbps), watts: fmtNum(tier.powerW), mass: fmtNum(tier.massKg) });
  }
  if (gameState.missionObjective.payloadKind === "plasma") {
    return t("selection.plasmaStats", {
      ...common,
      quantities: tier.quantities,
      data: fmtNum(tier.dataGbitPerDay, tier.dataGbitPerDay < 1 ? 1 : 0),
      watts: fmtNum(tier.powerW),
      mass: fmtNum(tier.massKg),
    });
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

// 圖鑑和精簡說明用的分組：酬載依任務分成光學、轉發器、電漿三組
function partGroupKey(key) {
  return key === "payload" ? "payload_" + gameState.missionObjective.payloadKind : key;
}

function partProtoText(key, tier) {
  const group = partGroupKey(key);
  return `${t(`brief.part.${group}.${tier.id}`)} ${codexLinkHtml("parts", `parts-${group}-${tier.id}`)}`;
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
      <img class="swatch swatch-part" src="${partImageSrc(key, tier.id)}" alt="${tierLabel(key, tier.id)}" />
      <div class="part-name">${tierLabel(key, tier.id)}</div>
      ${unavailableTag(available)}
      <div class="part-stats">${partStatsText(key, tier)}</div>
      <div class="part-proto">${partProtoText(key, tier)}</div>
    `;
    if (!available) {
      card.disabled = true;
      card.classList.add("unavailable");
    }

    if (MP.active && !mpCanEdit(key)) card.classList.add("mp-locked");

    card.addEventListener("click", () => {
      if (MP.active) {
        if (!mpTryEdit(key)) return;
        activeHotspot = null;
        mpSetDesign({ [key]: tier.id });
        return;
      }
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

// 換成這種推進系統，這次任務大約要帶多少推進劑：LEO 差別小、GEO 差別很大，一眼就看得出來
function fuelNeedText(fuel) {
  const kg = autoPropellantKg({ ...currentDesign(), fuel });
  if (kg >= PROPELLANT_MAX_KG) return `${glyph("warn")}${t("selection.fuelNeedTooMuch", { kg: fmtNum(PROPELLANT_MAX_KG) })}`;
  return `${glyph("dv")}${t("selection.fuelNeed", { kg: fmtNum(kg) })}`;
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
      <div class="part-stats">${fuelStatsText(fuel)}<br>${fuelNeedText(fuel)}</div>
      <div class="part-proto">${t("brief.part.fuel." + fuel.id)} ${codexLinkHtml("parts", "parts-fuel-" + fuel.id)}</div>
    `;

    if (MP.active && !mpCanEdit("fuel")) card.classList.add("mp-locked");

    card.addEventListener("click", () => {
      const firstPick = !gameState.fuel;
      if (MP.active) {
        if (!mpTryEdit("fuel")) return;
        const kg = firstPick ? autoPropellantKg({ ...currentDesign(), fuel }) : gameState.propellantKg;
        mpSetDesign({ fuel: fuel.id, propellantKg: kg });
        return;
      }
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

function propellantSliderMaxKg() {
  const range = Math.max(PROPELLANT_SLIDER_MIN_KG, autoPropellantKg(currentDesign()) * PROPELLANT_SLIDER_AUTO_MULTIPLE);
  return Math.min(PROPELLANT_MAX_KG, Math.max(Math.ceil(range / 50) * 50, gameState.propellantKg));
}

function renderPropellantControls() {
  const wrap = document.createElement("div");
  wrap.className = "fuel-controls";

  wrap.innerHTML = `
    <div class="meter-label"><span>${t("selection.propellantLabel")}</span><span id="propellant-value"></span></div>
    <input type="range" id="propellant-slider" class="fuel-slider" min="0" max="${propellantSliderMaxKg()}" step="${PROPELLANT_STEP_KG}" value="${gameState.propellantKg}" />
    <p id="propellant-summary" class="fuel-summary"></p>
    <button type="button" id="propellant-auto-btn" class="text-link-btn">${t("selection.propellantAutoBtn", { margin: fmtPct(AUTO_PROPELLANT_MARGIN) })}</button>
    <p class="detail-explainer">${t("brief.explainer.rocketEquation")} ${codexLinkHtml("concepts", "concepts-rocketEquation")}</p>
  `;

  const editable = mpCanEdit("fuel");
  wrap.querySelector("#propellant-slider").disabled = !editable;
  wrap.querySelector("#propellant-auto-btn").classList.toggle("hidden", !editable);

  wrap.querySelector("#propellant-slider").addEventListener("input", (e) => {
    gameState.propellantKg = Number(e.target.value);
    updateBudgetSheet();
    if (MP.active) mpSetPropellantThrottled(gameState.propellantKg);
  });
  wrap.querySelector("#propellant-auto-btn").addEventListener("click", () => {
    gameState.propellantKg = autoPropellantKg(currentDesign());
    if (MP.active) mpSetDesign({ propellantKg: gameState.propellantKg });
    const slider = wrap.querySelector("#propellant-slider");
    slider.max = propellantSliderMaxKg();
    slider.value = gameState.propellantKg;
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

function sheetLine({ icon, labelKey, valueText, ratio, status, explainKey, explainParams, extraText }) {
  const pct = Math.max(0, Math.min(100, ratio * 100));
  const extra = extraText ? sentenceGap() + extraText : "";
  return `
    <details class="sheet-line ${status}" data-key="${labelKey}">
      <summary>
        <span class="sheet-label">${glyph(icon)}${t(labelKey)}</span>
        <span class="sheet-value">${valueText}</span>
        <span class="sheet-bar"><span class="sheet-bar-fill" style="width:${pct}%"></span></span>
      </summary>
      <p class="sheet-explain">${t(explainKey, explainParams)}${extra}</p>
    </details>
  `;
}

function electricUnpoweredText(analysis) {
  return t("factorExplain.electricUnpowered", {
    need: fmtNum(gameState.fuel.powerW * ELECTRIC_MIN_POWER_FRACTION),
    have: fmtNum(analysis.powerAvailW),
    fuel: t("fuel." + gameState.fuel.id),
  });
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
    // 電腦還沒選時只看下傳量；選了之後取兩者較小的
    const cap = analysis.dataCapGbit !== undefined ? analysis.dataCapGbit : Infinity;
    const sent = Math.min(analysis.dataDownGbit, cap);
    const computerLimits = cap < analysis.dataDownGbit && cap < analysis.dataGenGbit;
    lines.push(sheetLine({
      icon: "data",
      labelKey: "sheet.data",
      valueText: `${fmtNum(sent, sent < 10 ? 1 : 0)} / ${fmtNum(analysis.dataGenGbit)} Gbit`,
      ratio: sent / analysis.dataGenGbit,
      status: statusForSupply(sent, analysis.dataGenGbit),
      explainKey: "sheetExplain.data_" + orbit.id,
      extraText: computerLimits ? t("sheetExplain.dataComputerLimit", { cap: fmtNum(analysis.dataCapGbit), down: fmtNum(analysis.dataDownGbit) }) : "",
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
    const extra = orbit.id === "geo" && gameState.rocket ? gameState.rocket.geoTransferExtraDvKmS || 0 : 0;
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
      extraText: [
        extra > 0 ? t("sheetExplain.dv_subgto", { rocket: t("rocket." + gameState.rocket.id + ".name"), extra: fmtNum(extra, 2) }) : "",
        analysis.electricUnpowered ? electricUnpoweredText(analysis) : "",
      ].filter(Boolean).join(sentenceGap()),
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
    if (req.type === "quantities") {
      return t("factorExplain.quantities", { have: gameState.parts.payload.quantities, need: req.count });
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
  if (analysis.electricUnpowered) return electricUnpoweredText(analysis);
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
  const expectedValue = analysis.complete ? computeExpectedValue(design, gameState.features, analysis) : 0;

  if (sheet) {
    const openKeys = new Set([...sheet.querySelectorAll("details[open]")].map((d) => d.dataset.key));
    const methodNote = gameState.features.operations
      ? `<div class="sheet-sub">${t("sheet.monteCarloNote", { runs: fmtNum(EV_SIMULATION_RUNS) })}</div>`
      : "";
    const headline = analysis.complete
      ? `
        <div class="sheet-headline">
          <div class="ev-ring" style="--ev: ${Math.round(expectedValue * 100)}"><span class="sheet-ev-number">${fmtPct(expectedValue)}</span></div>
          <div class="sheet-ev-text">
            <span class="sheet-ev-label">${t("sheet.expectedValue")}</span>
            <div class="sheet-sub">${t("sheet.fullSuccess", { pct: fmtPct(analysis.fullSuccess) })}</div>
            ${methodNote}
          </div>
        </div>`
      : `<div class="sheet-headline pending">${t("sheet.pending")}</div>`;

    sheet.innerHTML = `
      <h4 class="sheet-title">${t("sheet.title")}</h4>
      ${headline}
      <div class="sheet-section">${renderBudgetLines(analysis)}</div>
      ${analysis.complete ? `
        <h5 class="sheet-subtitle">${t("sheet.valueBreakdown")}</h5>
        <div class="sheet-section factor-grid">${renderFactorRows(analysis)}</div>
        <h5 class="sheet-subtitle">${t("sheet.reliability")}</h5>
        <div class="sheet-section reliability-grid">${renderReliabilityRows(analysis)}</div>` : ""}
    `;
    sheet.querySelectorAll("details").forEach((d) => {
      if (openKeys.has(d.dataset.key)) d.open = true;
    });
    FX.sheetUpdated(sheet);
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
  document.getElementById("action-ev").textContent = analysis.complete
    ? t("selection.actionEv", { ev: fmtPct(expectedValue) })
    : t("selection.actionPending");
  renderMissionHud();
  mpDecorateLaunchBtn();
  mpRenderNegotiation(analysis);
}
