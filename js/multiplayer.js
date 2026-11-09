// 多人連線：最多 4 人各用自己的裝置加入同一個房間，分工設計同一顆衛星、一起發射。
// 同步的只有「設計選擇、角色、發射種子、異常決策」；每台裝置用同一個亂數種子各自模擬，所以大家看到的結果完全一樣。

const MP_ROLES = ["director", "scientist", "engineer", "flight"];
// 每個角色負責的設計項目（對應選件畫面的卡片與熱點）
const MP_ROLE_KEYS = {
  director: ["orbit", "rocket"],
  scientist: ["payload"],
  engineer: ["power", "structure", "attitude"],
  flight: ["comm", "computer", "fuel"],
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
  const unread = mpUnreadCount();
  bar.innerHTML = `
    <span class="mp-bar-code">${t("mp.roomShort")} <b>${MP.code}</b></span>
    <button type="button" class="mp-chat-toggle${mpChatOpen ? " open" : ""}" data-chat-toggle>${t("mp.chat")}${unread ? `<span class="mp-unread">${unread}</span>` : ""}</button>
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
  mpChatOpen = false;
  mpRenderChat();
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
  mpRenderChat();
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
  const chatKeys = Object.keys(MP.room.chat || {}).sort();
  if (chatKeys.length > MP_CHAT_PRUNE_AT) {
    chatKeys.slice(0, chatKeys.length - MP_CHAT_KEEP).forEach((k) => {
      patch["chat/" + k] = null;
    });
  }
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
  const log = mpDesignChangeText(patch);
  if (log) mpSendChat(log, true);
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
  const tierName = (key) => (design.parts[key] ? tierLabel(key, design.parts[key].id) : "—");
  const costs = mpRoleCosts(design);
  const rows = {
    director: {
      choices: `${design.orbit ? t("orbit." + design.orbit.id) : "—"} · ${design.rocket ? t("rocket." + design.rocket.id + ".name") : "—"}`,
      costM: costs.director,
      impact: [[t("factor.coverage"), f.coverage], [t("mp.launchReliability"), analysis.reliability.launch]],
    },
    scientist: {
      choices: `${hotspotLabel("payload")}: ${tierName("payload")}`,
      costM: costs.scientist,
      impact: [[t("factor.performance"), f.performance]],
    },
    engineer: {
      choices: ["power", "structure", "attitude"].map((k) => `${hotspotLabel(k)}: ${tierName(k)}`).join(" · "),
      costM: costs.engineer,
      impact: [[t("factor.power"), f.power], [t("factor.pointing"), f.pointing]],
    },
    flight: {
      choices: `${hotspotLabel("comm")}: ${tierName("comm")} · ${hotspotLabel("computer")}: ${tierName("computer")} · ${design.fuel ? t("fuel." + design.fuel.id) : "—"}`,
      costM: costs.flight,
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

// ---------- 聊天室：隊友不在身邊時也能溝通；改設計時系統自動貼一則紀錄 ----------

const MP_CHAT_MAX_LENGTH = 120;
const MP_CHAT_KEEP = 80; // 房主只保留最近 80 則，避免房間資料越長越大
const MP_CHAT_PRUNE_AT = 100;

let mpChatOpen = false;
let mpChatSeen = 0; // 看過的最後一則訊息時間，用來算未讀數

function mpChatMessages(room = MP.room) {
  const chat = (room && room.chat) || {};
  return Object.keys(chat).sort().map((k) => chat[k]);
}

function mpSendChat(text, system = false) {
  const clean = String(text).trim().slice(0, MP_CHAT_MAX_LENGTH);
  if (!clean || !MP.active) return;
  const ts = Date.now();
  // 以時間開頭的 key：字典順序就是時間順序
  const key = ts.toString(36) + MP.pid.slice(-4);
  MP.net.update(MP.code, { ["chat/" + key]: { pid: MP.pid, name: mpPlayerName(MP.pid), text: clean, sys: system, ts } });
}

function mpSubmitChatInput() {
  const input = document.getElementById("mp-chat-input");
  mpSendChat(input.value);
  input.value = "";
}

function mpToggleChat(open = !mpChatOpen) {
  mpChatOpen = open;
  document.getElementById("mp-chat").classList.toggle("hidden", !open || !MP.active);
  if (open) {
    mpRenderChat();
    document.getElementById("mp-chat-input").focus();
  }
  mpRenderBar();
}

function mpUnreadCount() {
  if (mpChatOpen) return 0;
  return mpChatMessages().filter((m) => m.ts > mpChatSeen && m.pid !== MP.pid).length;
}

function mpRenderChat() {
  const panel = document.getElementById("mp-chat");
  if (!MP.active) {
    panel.classList.add("hidden");
    return;
  }
  if (!mpChatOpen) return;
  const messages = mpChatMessages();
  const log = document.getElementById("mp-chat-log");
  const atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 40;
  log.innerHTML = messages.length
    ? messages.map((m) => m.sys
      ? `<div class="mp-chat-msg sys">${mpEscape(m.text)}</div>`
      : `<div class="mp-chat-msg${m.pid === MP.pid ? " me" : ""}"><b>${mpEscape(m.name)}</b>${mpEscape(m.text)}</div>`).join("")
    : `<div class="mp-chat-msg sys">${t("mp.chatEmpty")}</div>`;
  if (atBottom || messages.length && messages[messages.length - 1].pid === MP.pid) log.scrollTop = log.scrollHeight;
  if (messages.length) mpChatSeen = messages[messages.length - 1].ts;
  document.getElementById("mp-chat-quick").innerHTML = tt("mp.chatQuick")
    .map((q, i) => `<button type="button" class="mp-chat-chip" data-quick="${i}">${mpEscape(q)}</button>`).join("");
}

// 設計改動的說明：「小華 把 結構與屏蔽 換成 高階（+$8M）」
function mpDesignChangeText(patch) {
  const before = currentDesign();
  const after = { ...before, parts: { ...before.parts } };
  const items = [];
  Object.keys(patch).forEach((key) => {
    const id = patch[key];
    if (key === "orbit") {
      after.orbit = ORBITS.find((o) => o.id === id);
      items.push([t("selection.orbitGroup"), t("orbit." + id)]);
    } else if (key === "rocket") {
      after.rocket = ROCKETS.find((r) => r.id === id);
      items.push([t("selection.rocketGroup"), t("rocket." + id + ".name")]);
    } else if (key === "fuel") {
      after.fuel = FUELS.find((f) => f.id === id);
      items.push([hotspotLabel("fuel"), t("fuel." + id)]);
    } else if (SUBSYSTEM_KEYS.includes(key)) {
      const options = key === "payload" ? payloadOptionsFor(gameState.missionObjective) : SUBSYSTEMS[key];
      after.parts[key] = options.find((o) => o.id === id);
      items.push([hotspotLabel(key), tierLabel(key, id)]);
    }
  });
  if (!items.length) return "";
  const delta = Math.round((designCostM(after) - designCostM(before)) * 10) / 10;
  const deltaText = delta === 0 ? "±$0M" : (delta > 0 ? "+" : "−") + fmtMoney(Math.abs(delta));
  return t("mp.sysChange", {
    name: mpPlayerName(MP.pid),
    changes: items.map(([label, value]) => t("mp.sysItem", { item: label, value })).join(t("mp.listSep")),
    delta: deltaText,
  });
}

// ---------- 協商面板：超出預算或質量時才出現，列出最划算的降級，由負責的人決定要不要讓步 ----------

let mpNegoCache = { key: null, options: [], baseEv: 0 };
let mpNegoTimer = null;

function mpDesignKey(d) {
  return [d.orbit && d.orbit.id, d.rocket && d.rocket.id, ...SUBSYSTEM_KEYS.map((k) => d.parts[k] && d.parts[k].id), d.fuel && d.fuel.id, d.propellantKg].join("|");
}

// 每個角色花了多少：火箭、酬載、電力＋結構＋姿態、通訊＋推進（含毒性推進劑的加注費用）
function mpRoleCosts(design) {
  const partCost = (key) => (design.parts[key] ? design.parts[key].costM : 0);
  const power = design.parts.power ? powerSystemSpec(design) : null;
  const fuelCost = design.fuel ? design.fuel.costM + (design.fuel.toxic ? TOXIC_HANDLING_COST_M : 0) : 0;
  return {
    director: design.rocket ? design.rocket.costM : 0,
    scientist: partCost("payload"),
    engineer: (power ? power.costM : 0) + partCost("structure") + partCost("attitude"),
    flight: partCost("comm") + partCost("computer") + fuelCost,
  };
}

// 只改一項、而且會省錢或減重的選項：零件降一級、換便宜的火箭或推進系統
function mpNegotiationOptions(design) {
  const features = gameState.features;
  const base = analyzeDesign(design);
  const baseEv = base.complete ? computeExpectedValue(design, features, base) : 0;
  const options = [];
  const consider = (key, value, label, variant) => {
    const a = analyzeDesign(variant);
    const saveM = Math.round((base.costM - a.costM) * 10) / 10;
    const saveKg = Math.round(base.wetKg - a.wetKg);
    const helps = (base.overBudget && saveM > 0) || (base.overMass && saveKg > 0);
    // 解決一個問題卻造成另一個（例如換成載不動的小火箭）的選項不列出
    const createsProblem = (a.overMass && !base.overMass) || (a.overBudget && !base.overBudget) || a.noCapacity;
    if (!helps || createsProblem) return;
    // 這一項能補上多少缺口（0～1），預算和質量取比較有幫助的那個
    const overM = base.costM - base.budgetM;
    const overKg = base.wetKg - base.capacityKg;
    const coverage = Math.min(1, Math.max(
      base.overBudget ? saveM / overM : 0,
      base.overMass ? saveKg / overKg : 0,
    ));
    options.push({
      key, value, label, saveM, saveKg, coverage,
      ev: a.complete ? computeExpectedValue(variant, features, a) : null,
      fixes: !a.overBudget && !a.overMass && !a.noCapacity,
    });
  };

  SUBSYSTEM_KEYS.forEach((key) => {
    const current = design.parts[key];
    if (!current) return;
    const tiers = key === "payload" ? payloadOptionsFor(design.objective) : SUBSYSTEMS[key];
    const lower = tiers[tiers.indexOf(current) - 1];
    if (!lower || !isOptionAvailable(design.event, key, lower)) return;
    consider(key, lower.id, t("mp.sysItem", { item: hotspotLabel(key), value: tierLabel(key, lower.id) }),
      { ...design, parts: { ...design.parts, [key]: lower } });
  });
  if (design.rocket) {
    ROCKETS.forEach((rocket) => {
      if (rocket === design.rocket || rocket.costM >= design.rocket.costM || !isOptionAvailable(design.event, "rocket", rocket)) return;
      consider("rocket", rocket.id, t("mp.sysItem", { item: t("selection.rocketGroup"), value: t("rocket." + rocket.id + ".name") }),
        { ...design, rocket });
    });
  }
  if (design.fuel) {
    FUELS.forEach((fuel) => {
      if (fuel !== design.fuel) {
        consider("fuel", fuel.id, t("mp.sysItem", { item: hotspotLabel("fuel"), value: t("fuel." + fuel.id) }), { ...design, fuel });
      }
    });
  }

  // 排序：能單獨解決的優先；其次是能補上至少 1/4 缺口的；同一級裡，「每省 $1M 損失的期望價值」最少的排前面
  const lossPerM = (o) => (o.ev === null ? 0 : Math.max(0, baseEv - o.ev)) / Math.max(o.saveM, 0.1);
  const big = (o) => (o.coverage >= 0.25 ? 1 : 0);
  options.sort((a, b) => (b.fixes - a.fixes) || (big(b) - big(a)) || (lossPerM(a) - lossPerM(b)));
  return { options: options.slice(0, 4), baseEv, complete: base.complete };
}

function mpRenderNegotiation(analysis) {
  const box = document.getElementById("mp-negotiate");
  if (!MP.active || !(analysis.overBudget || analysis.overMass)) {
    box.classList.add("hidden");
    box.innerHTML = "";
    return;
  }
  box.classList.remove("hidden");
  const design = currentDesign();
  const key = mpDesignKey(design);
  if (mpNegoCache.key === key) {
    box.innerHTML = mpNegotiationHtml(analysis);
    return;
  }
  box.innerHTML = mpNegotiationHeader(analysis) + `<p class="mp-nego-calc">${t("mp.negoCalculating")}</p>`;
  // 要模擬好幾個方案，延後一下再算，拖動滑桿時不會卡住
  clearTimeout(mpNegoTimer);
  mpNegoTimer = setTimeout(() => {
    if (mpDesignKey(currentDesign()) !== key) return;
    mpNegoCache = { key, ...mpNegotiationOptions(currentDesign()) };
    box.innerHTML = mpNegotiationHtml(analyzeDesign(currentDesign()));
  }, 120);
}

function mpNegotiationHeader(analysis) {
  const costs = mpRoleCosts(currentDesign());
  const title = analysis.overBudget
    ? t("mp.negoTitleBudget", { over: fmtMoney(Math.round((analysis.costM - analysis.budgetM) * 10) / 10) })
    : t("mp.negoTitleMass", { over: fmtNum(Math.round(analysis.wetKg - analysis.capacityKg)) });
  return `
    <h4 class="mp-nego-title">${glyph("warn")}${title}</h4>
    <p class="mp-nego-hint">${t("mp.negoHint")}</p>
    <div class="mp-nego-spend">${MP_ROLES.map((r) => {
      const holder = mpRoleHolder(r);
      return `<span><img class="glyph" src="image/icons/glyph-${MP_ROLE_GLYPH[r]}.png" alt="" />${t("mp.role." + r + ".name")}${holder ? " (" + mpEscape(mpPlayerName(holder)) + ")" : ""} ${fmtMoney(Math.round(costs[r] * 10) / 10)}</span>`;
    }).join("")}</div>`;
}

function mpNegotiationHtml(analysis) {
  const { options, baseEv, complete } = mpNegoCache;
  const list = options.length
    ? options.map((o, i) => {
      const role = mpRoleOf(o.key);
      const holder = mpRoleHolder(role);
      const mine = holder === MP.pid;
      const saves = [o.saveM > 0 ? t("mp.negoSaves", { cost: fmtMoney(o.saveM) }) : "", o.saveKg > 0 ? t("mp.negoSavesMass", { kg: fmtNum(o.saveKg) }) : ""].filter(Boolean).join(" · ");
      const ev = complete && o.ev !== null ? t("mp.negoEv", { from: fmtPct(baseEv), to: fmtPct(o.ev) }) : "";
      return `
        <div class="mp-nego-option">
          <div class="mp-nego-main">
            <div class="mp-nego-label">${o.label}${o.fixes ? `<span class="mp-nego-fix">${t("mp.negoFixes")}</span>` : ""}</div>
            <div class="mp-nego-meta">${saves}${ev ? " · " + ev : ""} · ${t("mp.role." + role + ".name")}${holder ? " (" + mpEscape(mpPlayerName(holder)) + ")" : ""}</div>
          </div>
          ${mine
            ? `<button type="button" class="btn btn-secondary mp-nego-btn" data-nego-apply="${i}">${t("mp.negoIDo")}</button>`
            : `<button type="button" class="btn btn-secondary mp-nego-btn" data-nego-ask="${i}">${t("mp.negoAsk")}</button>`}
        </div>`;
    }).join("")
    : `<p class="mp-nego-calc">${t("mp.negoNone")}</p>`;
  return mpNegotiationHeader(analysis) + list;
}

function mpOnNegotiationClick(e) {
  const apply = e.target.closest("[data-nego-apply]");
  const ask = e.target.closest("[data-nego-ask]");
  const option = apply ? mpNegoCache.options[apply.dataset.negoApply] : ask ? mpNegoCache.options[ask.dataset.negoAsk] : null;
  if (!option) return;
  if (apply) {
    if (!mpTryEdit(option.key)) return;
    const patch = { [option.key]: option.value };
    // 換推進系統時，推進劑沿用目前的量，由飛控再調整
    mpSetDesign(patch);
    return;
  }
  const holder = mpRoleHolder(mpRoleOf(option.key));
  mpSendChat(t("mp.negoAskMsg", {
    name: holder ? mpPlayerName(holder) : t("mp.role." + mpRoleOf(option.key) + ".name"),
    change: option.label,
    cost: option.saveM > 0 ? fmtMoney(option.saveM) : fmtNum(option.saveKg) + " kg",
  }));
  mpToggleChat(true);
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

  document.getElementById("mp-bar").addEventListener("click", (e) => {
    if (e.target.closest("[data-chat-toggle]")) mpToggleChat();
  });
  document.getElementById("mp-chat-close").addEventListener("click", () => mpToggleChat(false));
  document.getElementById("mp-chat-send").addEventListener("click", mpSubmitChatInput);
  document.getElementById("mp-chat-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.isComposing) mpSubmitChatInput();
  });
  document.getElementById("mp-chat-quick").addEventListener("click", (e) => {
    const chip = e.target.closest("[data-quick]");
    if (chip) mpSendChat(tt("mp.chatQuick")[chip.dataset.quick]);
  });
  document.getElementById("mp-negotiate").addEventListener("click", mpOnNegotiationClick);
}
