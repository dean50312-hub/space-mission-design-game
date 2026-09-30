// 任務模擬畫面：驅動任務時間軸（js/operations.js），播放火箭飛行動畫，並在運作期異常時請玩家做決定

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const OPERATIONS_ANIMATION_MS = 9000;

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
        await animateStageAttempt(STAGES[stageIndex], stageIndex, design, analysis, ev.odds);
      }
    } else if (ev.kind === "stageRoll") {
      await animateRoll(ev.odds, ev.passed);
    } else if (ev.kind === "stageEnd") {
      await animateStageResolve(STAGES[stageIndex], stageIndex, true);
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

// ---------- 飛行動畫：視角固定在畫面中心，背景場景（地面→雲層→大氣層→太空）往下捲動 ----------

const FLIGHT_START_PERCENT = 4;

function sceneTopForPercent(percent) {
  const scene = document.getElementById("flight-scene");
  const track = document.getElementById("flight-track");
  return -(scene.offsetHeight - track.offsetHeight) * (1 - percent / 100);
}

function setSceneProgress(percent, durationMs) {
  const scene = document.getElementById("flight-scene");
  scene.style.transition = `top ${durationMs}ms ease-in-out`;
  scene.style.top = `${sceneTopForPercent(percent)}px`;
  return sleep(durationMs);
}

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
  });

  document.getElementById("orbit-caption").textContent = t("simulation.orbitCaption", {
    period: design.orbit.id === "geo" ? t("simulation.periodDay") : t("simulation.periodMinutes", { min: Math.round(info.periodMin) }),
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

  const scene = document.getElementById("flight-scene");
  scene.style.transition = "none";
  scene.style.top = `${sceneTopForPercent(FLIGHT_START_PERCENT)}px`;
  void scene.offsetHeight; // 強制 reflow，確保下一次移動會套用 transition

  setRocketFlying(false);
  setRocketState("normal");
  scene.style.transition = "";

  document.getElementById("simulation-log").textContent = "";

  const dotsWrap = document.getElementById("stage-dots");
  dotsWrap.innerHTML = "";
  STAGES.forEach((stage, i) => {
    const dot = document.createElement("span");
    dot.className = "stage-dot";
    dot.id = `stage-dot-${i}`;
    dot.title = t("stage." + stage.id);
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
  const prevPercent = index === 0 ? FLIGHT_START_PERCENT : STAGE_TARGET_PERCENT_BY_ID[STAGES[index - 1].id];
  const targetPercent = STAGE_TARGET_PERCENT_BY_ID[stage.id];
  const midPercent = prevPercent + (targetPercent - prevPercent) * 0.55;

  setDotState(index, "active");
  showRollMeter(odds);
  document.getElementById("flight-track").classList.toggle("maxq", stage.id === "ascent");
  document.getElementById("simulation-log").textContent =
    t("simulation.checking", { stage: t("stage." + stage.id) }) + "\n" + stageFlavorText(stage, design, analysis);

  setRocketFlying(true);
  await setSceneProgress(midPercent, 900);
}

async function animateStageResolve(stage, index, passed) {
  const log = document.getElementById("simulation-log");
  const targetPercent = STAGE_TARGET_PERCENT_BY_ID[stage.id];
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
    await setSceneProgress(targetPercent, 500);
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
