// 多人連線：最多 4 人各用自己的裝置加入同一個房間，分工設計同一顆衛星、一起發射。
// 同步的只有「設計選擇、角色、發射種子、異常決策」；每台裝置用同一個亂數種子各自模擬，所以大家看到的結果完全一樣。

const MP_ROLES = ["director", "scientist", "engineer", "flight"];
// 每個角色負責的設計項目（對應選件畫面的卡片與熱點）
const MP_ROLE_KEYS = {
  director: ["orbit", "rocket"],
  scientist: ["payload"],
  engineer: ["power", "structure", "attitude"],
  flight: ["comm", "fuel"],
};
const MP_ROLE_GLYPH = { director: "cost", scientist: "star", engineer: "power", flight: "signal" };
const MP_MAX_PLAYERS = 4;
const MP_CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // 去掉容易看錯的 I、L、O、0、1
const MP_CODE_LENGTH = 4;
const MP_PROPELLANT_SYNC_MS = 150;

const MP = {
  net: null,
  active: false,
  code: null,
  room: null,
  pid: null,
  missionKey: null,
  flightRound: null,
  decisionIndex: 0,
  decisionWaiters: {},
  launching: false,
  propellantTimer: null,
};

function mpPlayerId() {
  let pid = null;
  try {
    pid = sessionStorage.getItem("mp-pid");
  } catch (e) {
    // 無法使用 sessionStorage 時每次重新產生
  }
  if (!pid) {
    pid = "p" + Math.random().toString(36).slice(2, 10);
    try {
      sessionStorage.setItem("mp-pid", pid);
    } catch (e) {
      // 同上
    }
  }
  return pid;
}

function mpSavedName() {
  try {
    return localStorage.getItem("mp-name") || "";
  } catch (e) {
    return "";
  }
}

function mpEscape(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---------- 房間狀態的查詢 ----------

function mpPlayers(room = MP.room) {
  const players = (room && room.players) || {};
  return Object.keys(players)
    .map((pid) => ({ pid, ...players[pid] }))
    .sort((a, b) => a.joinedAt - b.joinedAt);
}

// 房主離開時，由最早加入的玩家接手
function mpHostId(room = MP.room) {
  if (!room) return null;
  if (room.players && room.players[room.hostId]) return room.hostId;
  const players = mpPlayers(room);
  return players.length ? players[0].pid : null;
}

function mpIsHost() {
  return MP.active && mpHostId() === MP.pid;
}

function mpPlayerName(pid) {
  const p = MP.room && MP.room.players && MP.room.players[pid];
  return p ? p.name : "?";
}

function mpRoleHolder(role) {
  const pid = MP.room && MP.room.roles && MP.room.roles[role];
  return pid && MP.room.players && MP.room.players[pid] ? pid : null;
}

function mpHasRole(role) {
  return MP.active && mpRoleHolder(role) === MP.pid;
}

function mpRoleOf(key) {
  return MP_ROLES.find((r) => MP_ROLE_KEYS[r].includes(key));
}

function mpCanEdit(key) {
  if (!MP.active) return true;
  return mpHasRole(mpRoleOf(key));
}

function mpOwnerText(key) {
  const role = mpRoleOf(key);
  const holder = mpRoleHolder(role);
  return holder
    ? t("mp.ownerLine", { role: t("mp.role." + role + ".name"), name: mpEscape(mpPlayerName(holder)) })
    : t("mp.ownerVacant", { role: t("mp.role." + role + ".name") });
}

// 選件畫面的權限檢查：不是自己負責的項目，提示該找誰
function mpTryEdit(key) {
  if (mpCanEdit(key)) return true;
  mpToast(mpOwnerText(key));
  return false;
}

// ---------- 提示訊息與底部隊伍列 ----------

let mpToastTimer = null;

function mpToast(html) {
  const el = document.getElementById("mp-toast");
  el.innerHTML = html;
  el.classList.remove("hidden");
  clearTimeout(mpToastTimer);
  mpToastTimer = setTimeout(() => el.classList.add("hidden"), 2400);
}

function mpRenderBar() {
  const bar = document.getElementById("mp-bar");
  if (!MP.active || !MP.room) {
    bar.classList.add("hidden");
    return;
  }
  const host = mpHostId();
  const showReady = MP.room.phase === "design";
  bar.innerHTML = `
    <span class="mp-bar-code">${t("mp.roomShort")} <b>${MP.code}</b></span>
    ${mpPlayers().map((p) => {
      const roles = MP_ROLES.filter((r) => mpRoleHolder(r) === p.pid);
      return `
        <span class="mp-bar-player${p.pid === MP.pid ? " me" : ""}${showReady && p.ready ? " ready" : ""}">
          ${roles.map((r) => `<img class="glyph" src="image/icons/glyph-${MP_ROLE_GLYPH[r]}.png" alt="" title="${t("mp.role." + r + ".name")}" />`).join("")}
          ${mpEscape(p.name)}${p.pid === host ? `<span class="mp-host-tag">${t("mp.host")}</span>` : ""}
          ${showReady && p.ready ? glyph("check") : ""}
        </span>`;
    }).join("")}`;
  bar.classList.remove("hidden");
}

// ---------- 進入、建立、加入、離開房間 ----------

function mpOpen() {
  if (!MP.net) MP.net = createNet();
  if (!MP.pid) MP.pid = mpPlayerId();
  if (MP.active) {
    showScreen("mp");
    mpRenderLobby();
    return;
  }
  const nameInput = document.getElementById("mp-name");
  if (!nameInput.value) nameInput.value = mpSavedName() || t("mp.defaultName") + Math.floor(Math.random() * 90 + 10);
  document.getElementById("mp-error").textContent = "";
  mpShowPanel("entry");
  showScreen("mp");
}

function mpShowPanel(which) {
  const configured = Boolean(MP.net);
  document.getElementById("mp-entry").classList.toggle("hidden", which !== "entry");
  document.getElementById("mp-lobby").classList.toggle("hidden", which !== "lobby");
  document.getElementById("mp-not-configured").classList.toggle("hidden", configured);
  document.querySelectorAll("#mp-entry button, #mp-entry input").forEach((el) => {
    el.disabled = !configured;
  });
}

function mpCurrentName() {
  const name = document.getElementById("mp-name").value.trim().slice(0, 12) || t("mp.defaultName");
  try {
    localStorage.setItem("mp-name", name);
  } catch (e) {
    // 存不了就算了
  }
  return name;
}

function mpRandomCode() {
  let code = "";
  for (let i = 0; i < MP_CODE_LENGTH; i++) code += MP_CODE_CHARS[Math.floor(Math.random() * MP_CODE_CHARS.length)];
  return code;
}

async function mpCreateRoom() {
  const name = mpCurrentName();
  const room = {
    createdAt: Date.now(),
    hostId: MP.pid,
    phase: "lobby",
    setup: { objectiveId: "random", eventId: "random" },
    players: { [MP.pid]: { name, joinedAt: Date.now(), ready: false } },
    roles: {},
  };
  try {
    for (let attempt = 0; attempt < 6; attempt++) {
      const code = mpRandomCode();
      if (await MP.net.create(code, room)) {
        await mpEnterRoom(code);
        return;
      }
    }
    mpError("mp.errNetwork");
  } catch (e) {
    mpError("mp.errNetwork");
  }
}

async function mpJoinRoom() {
  const code = document.getElementById("mp-code").value.trim().toUpperCase();
  if (code.length !== MP_CODE_LENGTH) {
    mpError("mp.errNotFound");
    return;
  }
  try {
    const room = await MP.net.read(code);
    if (!room) {
      mpError("mp.errNotFound");
      return;
    }
    const players = room.players || {};
    if (!players[MP.pid] && Object.keys(players).length >= MP_MAX_PLAYERS) {
      mpError("mp.errFull");
      return;
    }
    const existing = players[MP.pid];
    await MP.net.update(code, {
      ["players/" + MP.pid]: { name: mpCurrentName(), joinedAt: existing ? existing.joinedAt : Date.now(), ready: false },
    });
    await mpEnterRoom(code);
  } catch (e) {
    mpError("mp.errNetwork");
  }
}

function mpError(key) {
  document.getElementById("mp-error").textContent = t(key);
}

async function mpEnterRoom(code) {
  MP.active = true;
  MP.code = code;
  MP.room = null;
  MP.missionKey = null;
  MP.flightRound = null;
  await MP.net.removeOnDisconnect(code, "players/" + MP.pid);
  await MP.net.watch(code, mpOnRoom);
}

async function mpLeave() {
  if (!MP.active) return;
  const code = MP.code;
  const patch = { ["players/" + MP.pid]: null };
  MP_ROLES.forEach((r) => {
    if (MP.room && MP.room.roles && MP.room.roles[r] === MP.pid) patch["roles/" + r] = null;
  });
  MP.net.unwatch();
  MP.net.cancelOnDisconnect(code, "players/" + MP.pid);
  MP.active = false;
  MP.room = null;
  MP.code = null;
  mpAbortFlight();
  mpRenderBar();
  try {
    await MP.net.update(code, patch);
  } catch (e) {
    // 離線時伺服器會在斷線後自動移除
  }
}

function mpLeaveToHome() {
  if (MP.active && !confirm(t("mp.leaveConfirm"))) return;
  mpLeave();
  goHome();
}

// ---------- 房間有任何變動時：依階段切換畫面 ----------

function mpOnRoom(room) {
  if (!MP.active) return;
  if (!room || !room.players || !room.players[MP.pid]) {
    MP.active = false;
    MP.room = null;
    mpAbortFlight();
    mpRenderBar();
    goHome();
    mpToast(t("mp.roomClosed"));
    return;
  }
  MP.room = room;
  if (MP.room.phase !== "flight") MP.launching = false;
  mpHostHousekeeping();
  mpRenderBar();

  const phase = room.phase;
  if (phase === "lobby") {
    if (MP.flightRound !== null) mpAbortFlight();
    MP.missionKey = null;
    MP.flightRound = null;
    if (activeScreenName() !== "mp") showScreen("mp");
    mpShowPanel("lobby");
    mpRenderLobby();
    return;
  }

  mpEnsureMission(room);
  const changed = mpApplyDesign(room.design || {});

  if (phase === "briefing") {
    renderEventScreen();
    mpDecorateBriefing();
    if (activeScreenName() !== "event") showScreen("event");
  } else if (phase === "design") {
    if (activeScreenName() !== "selection") showScreen("selection");
    else mpRefreshSelection(changed);
    mpMaybeLaunch();
  } else if (phase === "flight") {
    if (MP.flightRound !== room.flight.round) {
      MP.flightRound = room.flight.round;
      MP.decisionIndex = 0;
      MP.decisionWaiters = {};
      startSimulation(room.flight.seed);
    } else {
      mpResolveDecisions();
    }
  }
}

// 房主負責清掉已離開玩家留下的角色
function mpHostHousekeeping() {
  if (!mpIsHost()) return;
  const roles = MP.room.roles || {};
  const patch = {};
  Object.keys(roles).forEach((r) => {
    if (roles[r] && !MP.room.players[roles[r]]) patch["roles/" + r] = null;
  });
  if (Object.keys(patch).length) MP.net.update(MP.code, patch);
}

function mpEnsureMission(room) {
  const key = `${room.mission.objectiveId}/${room.mission.eventId}/${room.mission.round}`;
  if (MP.missionKey === key) return;
  MP.missionKey = key;
  MP.flightRound = null;
  gameState.campaignLevel = null;
  gameState.custom = { objectiveId: room.mission.objectiveId, eventId: room.mission.eventId };
  resetForNewGame();
  FX.resetSheetMemory();
}

// 把房間裡的設計（存的是 id）套用到本機的 gameState，回傳有改變的項目
function mpApplyDesign(d) {
  const changed = new Set();
  const set = (key, current, next, apply) => {
    if (current !== next) {
      apply(next);
      changed.add(key);
    }
  };
  set("orbit", gameState.orbit, ORBITS.find((o) => o.id === d.orbit) || null, (v) => {
    gameState.orbit = v;
    recomputeBudget();
  });
  set("rocket", gameState.rocket, ROCKETS.find((r) => r.id === d.rocket) || null, (v) => {
    gameState.rocket = v;
    if (v) rocketPickerExpanded = false;
  });
  SUBSYSTEM_KEYS.forEach((key) => {
    const options = key === "payload" ? payloadOptionsFor(gameState.missionObjective) : SUBSYSTEMS[key];
    set(key, gameState.parts[key], options.find((o) => o.id === d[key]) || null, (v) => {
      gameState.parts[key] = v;
    });
  });
  set("fuel", gameState.fuel, FUELS.find((f) => f.id === d.fuel) || null, (v) => {
    gameState.fuel = v;
  });
  set("propellantKg", gameState.propellantKg, d.propellantKg || 0, (v) => {
    gameState.propellantKg = v;
  });
  return changed;
}

// 改設計：寫進房間，同時取消所有人的「準備好」（設計變了要重新確認）
function mpSetDesign(patch) {
  const update = {};
  Object.keys(patch).forEach((k) => {
    update["design/" + k] = patch[k];
  });
  mpPlayers().forEach((p) => {
    if (p.ready) update[`players/${p.pid}/ready`] = false;
  });
  MP.net.update(MP.code, update);
}

// 推進劑滑桿拖動時，本機立即更新，房間每 150 ms 同步一次
function mpSetPropellantThrottled(kg) {
  clearTimeout(MP.propellantTimer);
  MP.propellantTimer = setTimeout(() => mpSetDesign({ propellantKg: kg }), MP_PROPELLANT_SYNC_MS);
}

function mpRefreshSelection(changed) {
  if (changed.size === 0) {
    mpDecorateLaunchBtn();
    return;
  }
  const slider = document.getElementById("propellant-slider");
  if (changed.size === 1 && changed.has("propellantKg") && slider) {
    if (document.activeElement !== slider) slider.value = gameState.propellantKg;
    updateBudgetSheet();
    return;
  }
  renderSelectionScreen();
}

// ---------- 大廳：選角色、房主設定任務 ----------

function mpRenderLobby() {
  if (!MP.room) return;
  const room = MP.room;
  const isHost = mpIsHost();
  document.getElementById("mp-room-code").textContent = MP.code;

  document.getElementById("mp-roles").innerHTML = MP_ROLES.map((r) => {
    const holder = mpRoleHolder(r);
    const mine = holder === MP.pid;
    return `
      <button type="button" class="part-card mp-role-card${mine ? " selected" : ""}${holder && !mine ? " mp-taken" : ""}" data-role="${r}">
        <div class="part-name"><img class="glyph" src="image/icons/glyph-${MP_ROLE_GLYPH[r]}.png" alt="" />${t("mp.role." + r + ".name")}</div>
        <div class="part-stats">${t("mp.role." + r + ".desc")}</div>
        <div class="mp-role-holder">${holder ? mpEscape(mpPlayerName(holder)) + (mine ? ` (${t("mp.you")})` : "") : t("mp.roleVacant")}</div>
      </button>`;
  }).join("");
  document.querySelectorAll(".mp-role-card").forEach((card) => {
    card.addEventListener("click", () => mpClaimRole(card.dataset.role));
  });

  const host = mpHostId();
  document.getElementById("mp-players").innerHTML = mpPlayers().map((p) =>
    `<li>${mpEscape(p.name)}${p.pid === MP.pid ? ` (${t("mp.you")})` : ""}${p.pid === host ? `<span class="mp-host-tag">${t("mp.host")}</span>` : ""}</li>`).join("");
  document.getElementById("mp-player-count").textContent = `${mpPlayers().length}/${MP_MAX_PLAYERS}`;

  const setup = room.setup || { objectiveId: "random", eventId: "random" };
  const objectiveSel = document.getElementById("mp-objective");
  const eventSel = document.getElementById("mp-event");
  objectiveSel.innerHTML = `<option value="random">${t("mp.random")}</option>` +
    MISSION_OBJECTIVES.map((o) => `<option value="${o.id}">${t("objective." + o.id + ".short")}</option>`).join("");
  eventSel.innerHTML = `<option value="random">${t("mp.random")}</option>` +
    EVENTS.map((e) => `<option value="${e.id}">${t("event." + e.id + ".name")}</option>`).join("");
  objectiveSel.value = setup.objectiveId;
  eventSel.value = setup.eventId;
  objectiveSel.disabled = !isHost;
  eventSel.disabled = !isHost;

  const vacant = MP_ROLES.filter((r) => !mpRoleHolder(r)).length;
  const startBtn = document.getElementById("mp-start-btn");
  startBtn.classList.toggle("hidden", !isHost);
  startBtn.disabled = vacant > 0;
  const status = document.getElementById("mp-lobby-status");
  if (vacant > 0) status.textContent = t("mp.startNeedRoles", { n: vacant });
  else status.textContent = isHost ? t("mp.readyToStart") : t("mp.waitingHost");
}

function mpClaimRole(role) {
  const holder = mpRoleHolder(role);
  if (holder && holder !== MP.pid) {
    mpToast(t("mp.roleTaken", { name: mpEscape(mpPlayerName(holder)) }));
    return;
  }
  MP.net.update(MP.code, { ["roles/" + role]: holder === MP.pid ? null : MP.pid });
}

function mpSetSetup(field, value) {
  if (!mpIsHost()) return;
  MP.net.update(MP.code, { ["setup/" + field]: value });
}

function mpStartMission() {
  if (!mpIsHost() || MP_ROLES.some((r) => !mpRoleHolder(r))) return;
  const setup = MP.room.setup || {};
  const objectiveId = setup.objectiveId && setup.objectiveId !== "random"
    ? setup.objectiveId
    : MISSION_OBJECTIVES[Math.floor(Math.random() * MISSION_OBJECTIVES.length)].id;
  const eventId = setup.eventId && setup.eventId !== "random" ? setup.eventId : pickRandomEvent(null).id;
  const patch = {
    phase: "briefing",
    mission: { objectiveId, eventId, round: Date.now() },
    design: null,
    flight: null,
    decisions: null,
  };
  mpPlayers().forEach((p) => {
    patch[`players/${p.pid}/ready`] = false;
  });
  MP.net.update(MP.code, patch);
}

// ---------- 任務簡報與設計畫面 ----------

function mpDecorateBriefing() {
  if (!MP.active) return;
  const note = document.getElementById("event-budget-note");
  if (!mpHasRole("director")) note.innerHTML += `<br><span class="mp-owner">${mpOwnerText("orbit")}</span>`;
}

function mpGoDesign() {
  if (!mpTryEdit("orbit") || !gameState.orbit) return;
  MP.net.update(MP.code, { phase: "design" });
}

function mpBackToBriefing() {
  if (!mpTryEdit("orbit")) return;
  MP.net.update(MP.code, { phase: "briefing" });
}

function mpReadyCount() {
  const players = mpPlayers();
  return { ready: players.filter((p) => p.ready).length, total: players.length };
}

function mpDecorateLaunchBtn() {
  const btn = document.getElementById("launch-btn");
  if (!MP.active) {
    btn.textContent = t("selection.launchBtn");
    btn.classList.remove("mp-is-ready");
    return;
  }
  if (!MP.room || MP.room.phase !== "design") return;
  const me = MP.room.players[MP.pid];
  const { ready, total } = mpReadyCount();
  btn.textContent = t(me && me.ready ? "mp.unreadyBtn" : "mp.readyBtn", { n: ready, total });
  btn.classList.toggle("mp-is-ready", Boolean(me && me.ready));
}

function mpToggleReady() {
  const me = MP.room && MP.room.players[MP.pid];
  if (!me) return;
  MP.net.update(MP.code, { [`players/${MP.pid}/ready`]: !me.ready });
}

// 所有人都按下「準備發射」、設計也能發射時，由房主送出發射指令和這次飛行的亂數種子
function mpMaybeLaunch() {
  if (!mpIsHost() || MP.launching) return;
  const { ready, total } = mpReadyCount();
  if (ready < total || total === 0) return;
  if (isLaunchBlocked(analyzeDesign(currentDesign()))) return;
  MP.launching = true;
  MP.net.update(MP.code, {
    phase: "flight",
    flight: { seed: (Math.random() * 2 ** 32) >>> 0, round: Date.now() },
    decisions: null,
  });
}

// ---------- 飛行：異常決策由「通訊與飛控」決定，其他人等待 ----------

function mpFlightStale(round) {
  return MP.active ? MP.flightRound !== round : round !== null;
}

function mpResolveDecisions() {
  const decisions = (MP.room && MP.room.decisions) || {};
  Object.keys(MP.decisionWaiters).forEach((n) => {
    if (decisions[n] !== undefined) {
      const resolve = MP.decisionWaiters[n];
      delete MP.decisionWaiters[n];
      resolve(decisions[n]);
    }
  });
}

function mpWaitDecision(n) {
  return new Promise((resolve) => {
    MP.decisionWaiters[n] = resolve;
    mpResolveDecisions();
  });
}

function mpSendDecision(n, index) {
  MP.net.update(MP.code, { ["decisions/" + n]: index });
}

// 房主讓大家回到大廳時，還在播的飛行動畫要停下來
function mpAbortFlight() {
  MP.flightRound = null;
  Object.values(MP.decisionWaiters).forEach((resolve) => resolve(0));
  MP.decisionWaiters = {};
  document.getElementById("anomaly-overlay").classList.add("hidden");
  stopUplink();
}

// ---------- 結果 ----------

function mpDecorateResults() {
  const again = document.getElementById("play-again-btn");
  if (!MP.active) {
    again.textContent = t("results.playAgain");
    again.disabled = false;
    return;
  }
  again.textContent = mpIsHost() ? t("mp.backToLobby") : t("mp.waitHostNext");
  again.disabled = !mpIsHost();
}

function mpBackToLobby() {
  if (!mpIsHost()) return;
  const patch = { phase: "lobby", mission: null, design: null, flight: null, decisions: null };
  mpPlayers().forEach((p) => {
    patch[`players/${p.pid}/ready`] = false;
  });
  MP.net.update(MP.code, patch);
}

// 團隊分工報告：每個角色的選擇、花了多少預算、影響了哪些任務價值因子
function mpTeamReportHtml(simResult) {
  if (!MP.active || !MP.room) return "";
  const { design, analysis } = simResult;
  const f = analysis.factors;
  const name = (key, obj) => (obj ? obj : "—");
  const tierName = (key) => (design.parts[key] ? t("tier." + design.parts[key].id) : "—");
  const power = powerSystemSpec(design);
  const partCost = (key) => (design.parts[key] ? design.parts[key].costM : 0);
  const rows = {
    director: {
      choices: `${name("orbit", design.orbit && t("orbit." + design.orbit.id))} · ${name("rocket", design.rocket && t("rocket." + design.rocket.id + ".name"))}`,
      costM: design.rocket ? design.rocket.costM : 0,
      impact: [[t("factor.coverage"), f.coverage], [t("mp.launchReliability"), analysis.reliability.launch]],
    },
    scientist: {
      choices: `${hotspotLabel("payload")}：${tierName("payload")}`,
      costM: partCost("payload"),
      impact: [[t("factor.performance"), f.performance]],
    },
    engineer: {
      choices: ["power", "structure", "attitude"].map((k) => `${hotspotLabel(k)}：${tierName(k)}`).join(" · "),
      costM: (power ? power.costM : 0) + partCost("structure") + partCost("attitude"),
      impact: [[t("factor.power"), f.power], [t("factor.pointing"), f.pointing]],
    },
    flight: {
      choices: `${hotspotLabel("comm")}：${tierName("comm")} · ${design.fuel ? t("fuel." + design.fuel.id) : "—"}`,
      costM: partCost("comm") + (design.fuel ? design.fuel.costM : 0),
      impact: [[t("factor.delivery"), f.delivery], [t("factor.lifetime"), f.lifetime]],
      extra: (simResult.decisions || []).length ? t("mp.decisionsMade", { n: simResult.decisions.length }) : "",
    },
  };
  const status = (v) => (v >= 0.9 ? "ok" : v >= 0.5 ? "warn" : "bad");
  return `
    <h3 class="section-title">${t("mp.teamTitle")}</h3>
    <p class="section-hint">${t("mp.teamHint")}</p>
    <div class="mp-team-report">
      ${MP_ROLES.map((r) => {
        const row = rows[r];
        const holder = mpRoleHolder(r);
        return `
          <div class="mp-team-row">
            <div class="mp-team-head"><img class="glyph" src="image/icons/glyph-${MP_ROLE_GLYPH[r]}.png" alt="" />${t("mp.role." + r + ".name")} · ${holder ? mpEscape(mpPlayerName(holder)) : "—"}</div>
            <div class="mp-team-choices">${row.choices}</div>
            <div class="mp-team-impact">
              <span>${t("mp.spent", { cost: fmtMoney(Math.round(row.costM * 10) / 10), share: fmtPct(row.costM / design.budgetM) })}</span>
              ${row.impact.map(([label, v]) => `<span class="mp-impact ${status(v)}">${label} ${fmtPct(v)}</span>`).join("")}
              ${row.extra ? `<span>${row.extra}</span>` : ""}
            </div>
          </div>`;
      }).join("")}
    </div>`;
}

function initMultiplayer() {
  MP.pid = mpPlayerId();
  MP.net = createNet();
  // 還沒設定 Firebase 的正式網站上先不顯示多人按鈕，免得玩家點進去發現不能用
  const homeBtn = document.getElementById("home-mp-btn");
  homeBtn.style.display = MP.net ? "" : "none";
  homeBtn.addEventListener("click", mpOpen);
  document.getElementById("mp-create-btn").addEventListener("click", mpCreateRoom);
  document.getElementById("mp-join-btn").addEventListener("click", mpJoinRoom);
  document.getElementById("mp-code").addEventListener("keydown", (e) => {
    if (e.key === "Enter") mpJoinRoom();
  });
  document.getElementById("mp-entry-back-btn").addEventListener("click", goHome);
  document.getElementById("mp-leave-btn").addEventListener("click", mpLeaveToHome);
  document.getElementById("mp-start-btn").addEventListener("click", mpStartMission);
  document.getElementById("mp-objective").addEventListener("change", (e) => mpSetSetup("objectiveId", e.target.value));
  document.getElementById("mp-event").addEventListener("change", (e) => mpSetSetup("eventId", e.target.value));
}
