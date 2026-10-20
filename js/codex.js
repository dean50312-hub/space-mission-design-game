// 太空圖鑑：遊戲畫面只放做決定需要的一句話，完整介紹、真實原型和科學概念都放在這裡

const CODEX_TABS = ["rockets", "orbits", "parts", "events", "objectives", "concepts"];
const CODEX_PART_GROUPS = ["power", "comm", "attitude", "structure", "payload_optical", "payload_transponder", "payload_plasma", "fuel"];
const CODEX_CONCEPTS = [
  "rocketEquation", "orbits", "gravityTurn", "inverseSquare", "diffraction", "angularMomentum",
  "magneticField", "eclipse", "radiation", "drag", "massMargin", "laplace", "expectedValue",
];

let codexTab = "rockets";
let codexReturn = null; // 從遊戲中打開圖鑑時，記住要回到哪個畫面、捲到哪裡

// 卡片和說明旁的小連結；卡片本身是按鈕，所以連結用 span，點擊在 capture 階段攔下
function codexLinkHtml(tab, entryId) {
  return `<span class="codex-link" role="button" tabindex="0" data-codex-tab="${tab}" data-codex-id="${entryId}" title="${t("codex.openTitle")}">${glyph("book")}${t("codex.open")}</span>`;
}

function codexPartGroupTitle(group) {
  if (group === "fuel") return t("selection.fuelGroup");
  if (group.startsWith("payload_")) return t("payloadKind." + group.slice("payload_".length));
  return t("subsystem." + group);
}

function codexPartTiers(group) {
  if (group === "fuel") return FUELS.map((f) => ({ id: f.id, name: t("fuel." + f.id), icon: `image/parts/fuel-${f.id}.png`, body: t("partProto.fuel." + f.id) }));
  const kind = group.startsWith("payload_") ? group.slice("payload_".length) : null;
  const tiers = kind ? PAYLOADS[kind] : SUBSYSTEMS[group];
  return tiers.map((tier) => ({
    id: tier.id,
    name: t("tier." + tier.id),
    icon: kind ? `image/parts/payload-${kind}-${tier.id}.png` : `image/parts/${group}-${tier.id}.png`,
    body: t(`partProto.${group}.${tier.id}`),
  }));
}

function codexEntryHtml({ id, icon, title, sub, body }) {
  return `
    <article class="codex-entry" id="codex-${id}">
      ${icon ? `<img class="codex-icon" src="${icon}" alt="" />` : `<span class="codex-icon codex-icon-glyph">${glyph("book")}</span>`}
      <div class="codex-entry-text">
        <h4>${title}</h4>
        ${sub ? `<div class="codex-sub">${sub}</div>` : ""}
        <p>${body}</p>
      </div>
    </article>`;
}

function codexSectionHtml(tab) {
  if (tab === "rockets") {
    return ROCKETS.map((r) => codexEntryHtml({
      id: "rockets-" + r.id, icon: `image/rocket/rocket-${r.id}.png`,
      title: t("rocket." + r.id + ".name"), sub: rocketStatsText(r), body: t("rocket." + r.id + ".proto"),
    })).join("");
  }
  if (tab === "orbits") {
    return ORBITS.map((o) => codexEntryHtml({
      id: "orbits-" + o.id, icon: `image/icons/orbit-${o.id}.png`, title: t("orbit." + o.id), body: t("orbitInfo." + o.id),
    })).join("");
  }
  if (tab === "parts") {
    return CODEX_PART_GROUPS.map((group) => `
      <section class="codex-group" id="codex-parts-${group}">
        <h3 class="section-title">${codexPartGroupTitle(group)}</h3>
        <p class="codex-group-intro">${t("explainer." + group)}</p>
        ${codexPartTiers(group).map((tier) => codexEntryHtml({
          id: `parts-${group}-${tier.id}`, icon: tier.icon, title: tier.name, body: tier.body,
        })).join("")}
      </section>`).join("");
  }
  if (tab === "events") {
    return EVENTS.map((e) => codexEntryHtml({
      id: "events-" + e.id, icon: `image/icons/event-${e.id}.png`, title: t("event." + e.id + ".name"), body: t("event." + e.id + ".desc"),
    })).join("");
  }
  if (tab === "objectives") {
    return MISSION_OBJECTIVES.map((o) => {
      const about = lookup(STRINGS[getLang()], `objective.${o.id}.about`);
      return codexEntryHtml({
        id: "objectives-" + o.id, icon: `image/icons/objective-${o.id}.png`, title: t("objective." + o.id + ".short"),
        sub: t("objective." + o.id + ".req"), body: about || t("objective." + o.id + ".desc"),
      });
    }).join("");
  }
  return CODEX_CONCEPTS.map((c) => codexEntryHtml({
    id: "concepts-" + c, title: t(`codex.concept.${c}.name`), body: t(`codex.concept.${c}.body`),
  })).join("");
}

function renderCodex() {
  const tabs = document.getElementById("codex-tabs");
  tabs.innerHTML = CODEX_TABS.map((tab) =>
    `<button type="button" class="seg-btn${tab === codexTab ? " selected" : ""}" data-tab="${tab}">${t("codex.tabs." + tab)}</button>`).join("");
  tabs.querySelectorAll("button").forEach((btn) => btn.addEventListener("click", () => {
    codexTab = btn.dataset.tab;
    renderCodex();
  }));
  document.getElementById("codex-entries").innerHTML = codexSectionHtml(codexTab);
  document.getElementById("codex-back-btn").textContent = codexReturn ? t("codex.backToGame") : t("nav.back");
}

function activeScreenName() {
  const active = document.querySelector(".screen.active");
  return active ? active.id.replace("screen-", "") : "home";
}

function openCodex(tab, entryId) {
  const from = activeScreenName();
  codexReturn = from === "home" || from === "codex" ? null : { screen: from, scrollY: window.scrollY };
  SCREEN_BGM.codex = SCREEN_BGM[from] || "space";
  codexTab = tab || "rockets";
  renderCodex();
  showScreen("codex");
  const target = entryId && document.getElementById("codex-" + entryId);
  if (target) {
    target.scrollIntoView({ block: "center" });
    target.classList.add("codex-flash");
  } else {
    window.scrollTo(0, 0);
  }
}

function closeCodex() {
  const back = codexReturn;
  codexReturn = null;
  if (!back) {
    goHome();
    return;
  }
  showScreen(back.screen);
  window.scrollTo(0, back.scrollY);
}

function initCodex() {
  document.getElementById("home-codex-btn").addEventListener("click", () => openCodex("rockets"));
  document.getElementById("codex-back-btn").addEventListener("click", closeCodex);

  const follow = (e) => {
    const link = e.target.closest(".codex-link");
    if (!link) return false;
    e.preventDefault();
    e.stopPropagation();
    openCodex(link.dataset.codexTab, link.dataset.codexId);
    return true;
  };
  document.addEventListener("click", follow, true);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") follow(e);
  }, true);
}
