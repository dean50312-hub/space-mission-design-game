// 任務模擬畫面：驅動任務時間軸（js/operations.js），播放火箭飛行動畫，並在運作期異常時請玩家做決定

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const OPERATIONS_ANIMATION_MS = 12000;

async function runSimulation() {
  const design = currentDesign();
  const analysis = analyzeDesign(design);
  const features = gameState.features;
  const expectedValue = computeExpectedValue(design, features, analysis);
  const gen = missionTimeline(analysis, design, features, makeRng((Math.random() * 2 ** 32) >>> 0));

  const log = document.getElementById("simulation-log");
  const yearStepMs = Math.round(OPERATIONS_ANIMATION_MS / design.orbit.designLifeYears);
  let stageIndex = -1;
  let step = gen.next();

  while (!step.done) {
    const ev = step.value;
    let reply;

    if (ev.kind === "stageStart") {
      stageIndex = STAGES.findIndex((s) => s.id === ev.stageId);
      if (ev.stageId === "operation") {
        hideRollMeter();
        setDotState(stageIndex, "active");
        enterOrbitMode(design, ev.valueCap);
        log.textContent = t("simulation.flavor.operation");
        await sleep(900);
      } else {
        if (ev.stageId === "insertion") await playFairingSeparation(design);
        await animateStageAttempt(STAGES[stageIndex], stageIndex, design, analysis, ev.odds);
      }
    } else if (ev.kind === "stageRoll") {
      await animateRoll(ev.odds, ev.passed);
    } else if (ev.kind === "stageEnd") {
      await animateStageResolve(STAGES[stageIndex], stageIndex, true);
      if (ev.stageId === "ascent") await playStaging(design);
    } else if (ev.kind === "year") {
      updateOpsHud(ev.delivered, ev.phase === "extension");
      log.textContent = ev.phase === "extension"
        ? t("simulation.extensionYear", { year: ev.year, total: design.orbit.designLifeYears })
        : t("simulation.operatingYear", { year: ev.year, total: design.orbit.designLifeYears });
      await sleep(yearStepMs);
    } else if (ev.kind === "decision") {
      updateOpsHud(ev.delivered, false);
      OrbitView.setState("anomaly");
      reply = await showAnomalyDecision(ev, design);
    } else if (ev.kind === "decisionResult") {
      OrbitView.setState("ok");
      log.textContent = decisionResultText(ev);
      await sleep(900);
    } else if (ev.kind === "extensionStart") {
      log.textContent = t("simulation.extensionStart", { years: fmtNum(ev.years, 1) });
      sfxPass();
      await sleep(1200);
    }

    step = gen.next(reply);
  }

  const outcome = step.value;
  const overallSuccess = outcome.failedStageId === null;
  const failedIndex = overallSuccess ? STAGES.length - 1 : STAGES.findIndex((s) => s.id === outcome.failedStageId);
  if (outcome.failedStageId === "operation" || overallSuccess) updateOpsHud(outcome.deliveredValue, outcome.extensionYears > 0);
  if (outcome.failedStageId === "operation") OrbitView.setState("dead");
  await animateStageResolve(STAGES[failedIndex], failedIndex, overallSuccess);

  return {
    design,
    analysis,
    expectedValue,
    overallSuccess,
    stageReachedIndex: failedIndex,
    failedStage: overallSuccess ? null : STAGES[failedIndex],
    cause: outcome.cause,
    serviceYears: outcome.serviceYears,
    extensionYears: outcome.extensionYears,
    deliveredValue: Math.max(0, outcome.deliveredValue),
    propellantDepleted: overallSuccess && outcome.propellantDepleted,
    decisions: outcome.decisions,
    reserveLeftM: outcome.reserveLeftM,
  };
}

// ---------- 運作期異常決策視窗 ----------

function anomalyTextKey(source) {
  return "anomaly." + source.id;
}

function optionEffectText(option) {
  return t("anomalyOption." + option.id + ".effect");
}

function decisionResultText(ev) {
  if (ev.succeeded === true) return t("simulation.fixSucceeded");
  if (ev.succeeded === false) return t("simulation.fixFailed");
  return t("simulation.decisionApplied", { option: t("anomalyOption." + ev.option.id + ".label") });
}

async function showAnomalyDecision(ev, design) {
  await showTutorialIfNeeded("operations");
  sfxFail();

  const overlay = document.getElementById("anomaly-overlay");
  document.getElementById("anomaly-title").textContent = t(anomalyTextKey(ev.source) + ".name");
  document.getElementById("anomaly-desc").textContent = t(anomalyTextKey(ev.source) + ".desc");
  document.getElementById("anomaly-meta").textContent = t("anomalyUi.meta", {
    year: fmtNum(ev.time, 1),
    reserve: fmtMoney(Math.round(ev.reserveM * 10) / 10),
  });
  document.getElementById("anomaly-hint").textContent = t("anomalyUi.hint");

  const list = document.getElementById("anomaly-options");
  list.innerHTML = "";

  return new Promise((resolve) => {
    ev.choices.forEach((choice, index) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "anomaly-option";
      btn.disabled = !choice.affordable;
      const cost = choice.option.costM > 0 ? fmtMoney(choice.option.costM) : t("anomalyUi.free");
      btn.innerHTML = `
        <span class="anomaly-option-head"><span>${t("anomalyOption." + choice.option.id + ".label")}</span><span class="anomaly-option-cost">${cost}</span></span>
        <span class="anomaly-option-effect">${optionEffectText(choice.option)}</span>
        <span class="anomaly-option-estimate">${choice.affordable
          ? t("anomalyUi.estimate", { value: fmtPct(Math.max(0, choice.estimate), choice.estimate < 0.1 ? 1 : 0) })
          : t("anomalyUi.cannotAfford")}</span>
      `;
      btn.addEventListener("click", () => {
        sfxClick();
        overlay.classList.add("hidden");
        resolve(index);
      });
      list.appendChild(btn);
    });
    overlay.classList.remove("hidden");
  });
}

// ---------- 飛行動畫：火箭沿著重力轉向軌跡飛行（畫面由 js/ascentview.js 繪製）----------

function setRocketFlying(on) {
  document.getElementById("rocket").classList.toggle("flying", on);
  document.getElementById("exhaust").classList.toggle("active", on);
}

let explosionTimer = null;

function setRocketState(state) {
  const rocket = document.getElementById("rocket");
  const img = document.getElementById("rocket-img");
  rocket.classList.toggle("exploding", state === "exploded");
  clearInterval(explosionTimer);

  if (state === "exploded") {
    let frame = 1;
    img.src = "image/rocket/explosion-1.png";
    explosionTimer = setInterval(() => {
      frame += 1;
      if (frame > 3) return clearInterval(explosionTimer);
      img.src = `image/rocket/explosion-${frame}.png`;
    }, 140);
  } else if (gameState.rocket) {
    img.src = `image/rocket/rocket-${gameState.rocket.id}.png`;
  }

  resetRocketClip();
  // Falcon Heavy 三支核心並聯、PSLV 兩側有固體助推器，所以有三道火焰；爆炸後就沒有火焰
  const rocketId = gameState.rocket ? gameState.rocket.id : null;
  setFlames(state === "exploded" ? 0 : ROCKET_STAGING[rocketId] && ROCKET_STAGING[rocketId].boosterSide ? 3 : 1);
}

function setFlames(count) {
  const exhaust = document.getElementById("exhaust");
  exhaust.classList.toggle("narrow", Boolean(gameState.rocket) && gameState.rocket.id === "pslv" && count > 1);
  exhaust.innerHTML = '<span class="flame"></span>'.repeat(count);
}

// ---------- 真實的飛行事件：助推器分離、一二節分離、整流罩分離 ----------
// 數值是 image/rocket/rocket-*.png 上的位置比例：boosterSide = 兩側助推器各占圖寬多少，
// stageCut = 第一節占圖高多少（從底部算），fairing = 整流罩占圖高多少（從頂部算）

const ROCKET_STAGING = {
  light: { stageCut: 0.62, fairing: 0.22 },
  pslv: { boosterSide: 0.25, stageCut: 0.34, fairing: 0.28 },
  medium: { stageCut: 0.66, fairing: 0.22 },
  heavy: { boosterSide: 0.35, stageCut: 0.66, fairing: 0.22 },
};

let rocketClip = { top: 0, right: 0, bottom: 0, left: 0 };

function resetRocketClip() {
  rocketClip = { top: 0, right: 0, bottom: 0, left: 0 };
  document.getElementById("rocket-img").style.clipPath = "";
  document.getElementById("exhaust").style.transform = "";
  document.querySelectorAll(".rocket-piece").forEach((el) => el.remove());
}

// 只顯示還沒分離的那一段，尾焰也跟著移到剩下那一節的底部
function applyRocketClip() {
  const img = document.getElementById("rocket-img");
  const c = rocketClip;
  img.style.clipPath = `inset(${c.top}% ${c.right}% ${c.bottom}% ${c.left}%)`;
  document.getElementById("exhaust").style.transform = `translateY(${(-c.bottom / 100) * img.offsetHeight}px)`;
}

// 用火箭圖的一部分做出分離的碎片，往 (dx, dy) 方向飛走並淡出
function dropPiece(inset, dx, dy, rotateDeg) {
  const piece = document.getElementById("rocket-img").cloneNode();
  piece.removeAttribute("id");
  piece.className = "rocket-piece";
  piece.style.clipPath = `inset(${inset})`;
  piece.style.setProperty("--dx", `${dx}px`);
  piece.style.setProperty("--dy", `${dy}px`);
  piece.style.setProperty("--rot", `${rotateDeg}deg`);
  document.getElementById("rocket").appendChild(piece);
  setTimeout(() => piece.remove(), 1600);
}

async function flightEvent(text, action) {
  document.getElementById("simulation-log").textContent = text;
  action();
  await sleep(1400);
}

async function playStaging(design) {
  const id = design.rocket.id;
  const cfg = ROCKET_STAGING[id];
  setRocketFlying(true);
  if (cfg.boosterSide) {
    await flightEvent(t("simulation.event.boosterSep_" + id), () => {
      const keep = 100 - cfg.boosterSide * 100;
      dropPiece(`0 ${keep}% 0 0`, -28, 60, -16);
      dropPiece(`0 0 0 ${keep}%`, 28, 60, 16);
      rocketClip.left = cfg.boosterSide * 100;
      rocketClip.right = cfg.boosterSide * 100;
      applyRocketClip();
      setFlames(1);
    });
  }
  // 主引擎關機（MECO）→ 分離 → 第二節點火
  await flightEvent(t("simulation.event.stageSep") + t("simulation.event.stageNote_" + id), () => {
    setRocketFlying(false);
    setTimeout(() => setRocketFlying(true), 700);
    const c = rocketClip;
    dropPiece(`${100 - cfg.stageCut * 100}% ${c.right}% 0 ${c.left}%`, 0, 80, 10);
    c.bottom = cfg.stageCut * 100;
    applyRocketClip();
  });
}

async function playFairingSeparation(design) {
  const f = ROCKET_STAGING[design.rocket.id].fairing * 100;
  AscentView.flyTo(FAIRING_SEPARATION_TIME, 1400);
  await flightEvent(t("simulation.event.fairingSep"), () => {
    const c = rocketClip;
    const mid = c.left + (100 - c.left - c.right) / 2;
    dropPiece(`0 ${100 - mid}% ${100 - f}% ${c.left}%`, -34, 24, -50);
    dropPiece(`0 ${c.right}% ${100 - f}% ${mid}%`, 34, 24, 50);
    c.top = f;
    applyRocketClip();
  });
}

function shakeTrack() {
  const track = document.getElementById("flight-track");
  track.classList.remove("shake");
  void track.offsetWidth;
  track.classList.add("shake");
}

// ---------- 各階段成功率判定條 ----------

function showRollMeter(odds) {
  document.getElementById("roll-meter").classList.remove("hidden");
  document.getElementById("roll-odds-label").textContent = t("simulation.rollOdds", { pct: fmtPct(odds, odds < 1 ? 1 : 0) });
  document.getElementById("roll-success").style.width = `${odds * 100}%`;
  const verdict = document.getElementById("roll-verdict");
  verdict.textContent = "";
  verdict.className = "roll-verdict";
  const needle = document.getElementById("roll-needle");
  needle.style.transition = "none";
  needle.style.left = "0%";
}

function hideRollMeter() {
  document.getElementById("roll-meter").classList.add("hidden");
}

// 指針落點依判定結果取樣：成功落在綠區、失敗落在紅區，分布和單次擲骰完全相同
async function animateRoll(odds, passed) {
  const needle = document.getElementById("roll-needle");
  const verdict = document.getElementById("roll-verdict");
  const landing = passed ? Math.random() * odds : odds + Math.random() * (1 - odds);
  const risky = odds > 0 && odds < 0.9999;

  if (risky) {
    needle.style.transition = "left 0.14s ease-in-out";
    for (const pos of [0.2, 0.85, 0.35, 0.95, 0.6]) {
      needle.style.left = `${pos * 100}%`;
      await sleep(150);
    }
    needle.style.transition = "left 0.45s cubic-bezier(0.2, 0.8, 0.3, 1)";
  }
  needle.style.left = `${landing * 100}%`;
  await sleep(risky ? 550 : 200);

  verdict.textContent = passed ? t("simulation.rollPass") : t("simulation.rollFail");
  verdict.classList.add(passed ? "pass" : "fail");
  await sleep(350);
}

// ---------- 運作期軌道畫面 ----------

let opsValueCap = 1;

function enterOrbitMode(design, valueCap) {
  playBgm("space");
  AscentView.stop();
  document.getElementById("flight-track").classList.add("orbit-mode");
  opsValueCap = valueCap;
  document.getElementById("ops-hud-label").textContent = t("simulation.hudLabel");
  document.getElementById("ops-hud-cap").style.left = `${Math.min(100, valueCap * 100)}%`;
  updateOpsHud(0, false);

  const status = document.getElementById("ops-hud-status");
  let lastVisible = null;
  const info = OrbitView.start(document.getElementById("orbit-canvas"), design.orbit, (visible) => {
    if (visible === lastVisible) return;
    lastVisible = visible;
    status.textContent = visible
      ? t(design.orbit.id === "geo" ? "simulation.hudLinkGeo" : "simulation.hudLinkLeo")
      : t("simulation.hudWaiting");
    status.classList.toggle("live", visible);
  }, t("simulation.stationName"));

  // 兩種時間尺度：地球自轉和衛星繞行照真實比例（1 天 = 20 秒），任務年份另外快轉
  const life = design.orbit.designLifeYears;
  const yearSeconds = OPERATIONS_ANIMATION_MS / life / 1000;
  document.getElementById("ops-hud-time").textContent = t("simulation.hudTime", {
    day: EARTH_SPIN_VISUAL_SECONDS,
    year: fmtNum(yearSeconds, 1),
  });
  document.getElementById("orbit-caption").textContent =
    t("simulation.timeScale", {
      day: EARTH_SPIN_VISUAL_SECONDS,
      year: fmtNum(yearSeconds, 1),
      life,
      hours: fmtNum((life * 365.25 * EARTH_SPIN_VISUAL_SECONDS) / 3600),
    }) +
    " · " +
    t("simulation.orbitCaption_" + design.orbit.id, {
      min: Math.round(info.periodMin),
      ratio: fmtNum(info.ratio, 2),
    });
}

function updateOpsHud(delivered, extension) {
  const fill = document.getElementById("ops-hud-fill");
  fill.style.width = `${Math.min(100, delivered * 100)}%`;
  fill.classList.toggle("extension", extension);
  document.getElementById("ops-hud-value").textContent = t("simulation.hudValue", {
    value: fmtPct(delivered),
    cap: fmtPct(opsValueCap),
  });
}

function resetFlightView() {
  OrbitView.stop();
  document.getElementById("flight-track").classList.remove("orbit-mode", "shake", "maxq");
  hideRollMeter();

  setRocketFlying(false);
  setRocketState("normal");
  AscentView.start(document.getElementById("ascent-canvas"), gameState.orbit.id);

  document.getElementById("simulation-log").textContent = "";

  const dotsWrap = document.getElementById("stage-dots");
  dotsWrap.innerHTML = "";
  STAGES.forEach((stage, i) => {
    const dot = document.createElement("span");
    dot.className = "stage-dot";
    dot.id = `stage-dot-${i}`;
    dot.title = t("stage." + stage.id);
    dot.textContent = t("stageShort." + stage.id);
    dotsWrap.appendChild(dot);
  });
}

function setDotState(index, state) {
  const dot = document.getElementById(`stage-dot-${index}`);
  dot.classList.remove("active", "pass", "fail", "skipped");
  dot.classList.add(state);
}

function markRemainingDotsSkipped(failedIndex) {
  for (let i = failedIndex + 1; i < STAGES.length; i++) {
    setDotState(i, "skipped");
  }
}

function stageFlavorText(stage, design, analysis) {
  if (stage.id === "insertion") {
    if (design.orbit.id === "leo") return t("simulation.flavor.insertionLeo");
    if (design.fuel.electric) {
      return t("simulation.flavor.insertionElectric", { months: Math.round(analysis.transferYears * 12) });
    }
    return t("simulation.flavor.insertionGeo");
  }
  return t("simulation.flavor." + stage.id);
}

async function animateStageAttempt(stage, index, design, analysis, odds) {
  setDotState(index, "active");
  showRollMeter(odds);
  document.getElementById("flight-track").classList.toggle("maxq", stage.id === "ascent");
  document.getElementById("simulation-log").textContent =
    t("simulation.checking", { stage: t("stage." + stage.id) }) + "\n" + stageFlavorText(stage, design, analysis);

  setRocketFlying(true);
  const flight = STAGE_FLIGHT[stage.id];
  await AscentView.flyTo(flight.mid, flight.attemptMs);
}

async function animateStageResolve(stage, index, passed) {
  const log = document.getElementById("simulation-log");
  const stageName = t("stage." + stage.id);

  if (passed) {
    setDotState(index, "pass");
    document.getElementById("flight-track").classList.remove("maxq");
    log.textContent = t("simulation.passed", { stage: stageName });
    sfxPass();
    if (stage.id === "operation") {
      await sleep(600);
      return;
    }
    const flight = STAGE_FLIGHT[stage.id];
    await AscentView.flyTo(flight.end, flight.resolveMs);
    setRocketFlying(false);
    await sleep(300);
  } else {
    setRocketFlying(false);
    document.getElementById("flight-track").classList.remove("maxq");
    if (stage.id !== "operation") setRocketState("exploded");
    shakeTrack();
    setDotState(index, "fail");
    log.textContent = t("simulation.failed", { stage: stageName });
    sfxFail();
    markRemainingDotsSkipped(index);
    await sleep(1000);
  }
}
