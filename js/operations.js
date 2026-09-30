// 任務時間軸：發射 → 入軌 → 展開 → 運作（異常決策）→ 延長任務。
// 用 generator 寫成，動畫版（等玩家做決定）和蒙地卡羅版（用精算策略自動決定）共用同一套邏輯。

function makeRng(seed) {
  let a = seed >>> 0;
  return function mulberry32() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleExp(rate, rng) {
  if (rate <= 0) return Infinity;
  return -Math.log(1 - rng()) / rate;
}

function pickByWeight(entries, rng) {
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = rng() * total;
  for (const [key, w] of entries) {
    roll -= w;
    if (roll <= 0) return key;
  }
  return entries[entries.length - 1][0];
}

function dvPerServiceYear(orbit) {
  return orbit.dvOpsKmS / orbit.designLifeYears;
}

// ---------- 精算估計：每個選項預期還能交付多少任務價值 ----------

function fatalHazard(analysis, features) {
  const share = features.operations ? 1 - RECOVERABLE_ANOMALY_SHARE : 1;
  return analysis.reliability.hazardPerYear * share;
}

function expectedServiceYears(hazard, years) {
  if (years <= 0) return 0;
  if (hazard <= 0) return years;
  return (1 - Math.exp(-hazard * years)) / hazard;
}

function estimateRemainingValue(ctx, state) {
  const { analysis, design, features } = ctx;
  const life = design.orbit.designLifeYears;
  const hazard = fatalHazard(analysis, features);
  const mainYears = Math.max(0, Math.min(life, state.dvYears) - state.time);
  let value = ctx.baseRate * state.multiplier * expectedServiceYears(hazard, mainYears);

  if (features.operations) {
    const extYears = Math.min(
      state.reserveM / EXTENDED_MISSION_COST_PER_YEAR_M,
      life * EXTENSION_MAX_FRACTION,
      Math.max(0, state.dvYears - life)
    );
    value += ctx.baseRate * state.multiplier * Math.exp(-hazard * mainYears) * expectedServiceYears(hazard, extYears);
  }
  return Math.min(value, Math.max(0, ctx.valueCap - state.delivered));
}

function applyEffect(state, effect, time) {
  const next = { ...state };
  if (effect.multiply) next.multiplier *= effect.multiply;
  if (effect.lifeMultiply) next.dvYears = time + (next.dvYears - time) * effect.lifeMultiply;
  if (effect.dvCostKmS) next.dvYears -= effect.dvCostKmS / next.dvPerYear;
  return next;
}

function estimateOption(ctx, state, option) {
  const effect = option.effect;
  const afterCost = { ...state, reserveM: state.reserveM - option.costM };

  if (effect.successChance !== undefined) {
    const ok = estimateRemainingValue(ctx, afterCost);
    const fail = estimateRemainingValue(ctx, applyEffect(afterCost, effect.onFail, state.time));
    return effect.successChance * ok + (1 - effect.successChance) * fail;
  }

  const after = applyEffect(afterCost, effect, state.time);
  let value = estimateRemainingValue(ctx, after);
  if (effect.fatalChance) value *= 1 - effect.fatalChance;
  if (effect.lostYears) value -= ctx.baseRate * state.multiplier * effect.lostYears;
  if (effect.anomalyChance) {
    const worstFix = Math.min(...COMPONENT_ANOMALIES.power.options.map((o) => estimateOption(ctx, after, o)));
    value -= effect.anomalyChance * (value - worstFix);
  }
  return value;
}

function decisionOptions(ctx, state, options) {
  return options.map((option) => ({
    option,
    affordable: option.costM <= state.reserveM + 1e-9,
    estimate: estimateOption(ctx, state, option),
  }));
}

function actuarialChoice(choices) {
  let best = -1;
  choices.forEach((c, i) => {
    if (c.affordable && (best < 0 || c.estimate > choices[best].estimate)) best = i;
  });
  return best;
}

// ---------- 任務時間軸 ----------

function* missionTimeline(analysis, design, features, rng) {
  const rel = analysis.reliability;
  const outcome = {
    failedStageId: null,
    cause: null,
    serviceYears: 0,
    extensionYears: 0,
    deliveredValue: 0,
    reserveLeftM: Math.max(0, design.budgetM - analysis.costM),
    decisions: [],
  };
  let state = null;
  const fail = (stageId, cause) => {
    outcome.failedStageId = stageId;
    outcome.cause = cause;
    if (state) {
      const life = design.orbit.designLifeYears;
      outcome.serviceYears = Math.min(state.time, life);
      outcome.extensionYears = Math.max(0, state.time - life);
      outcome.reserveLeftM = state.reserveM;
    }
    return outcome;
  };

  // 每個離散階段：先公布成功機率，擲骰後再揭曉（動畫版用來製造懸念，蒙地卡羅版直接略過）
  const rollStage = function* (stageId, odds, failureCause) {
    yield { kind: "stageStart", stageId, odds };
    const cause = failureCause();
    yield { kind: "stageRoll", stageId, odds, passed: !cause };
    if (cause) return cause;
    yield { kind: "stageEnd", stageId };
    return null;
  };

  const rocketFailure = 1 - rel.rocket;
  const liftoffFailure = rocketFailure * LIFTOFF_SHARE_OF_LAUNCH_FAILURE;
  const ascentRocketPass = (1 - rocketFailure) / (1 - liftoffFailure);
  const launchSurvival = design.parts.structure.launchSurvival;

  let cause = yield* rollStage("liftoff", 1 - liftoffFailure, () => (rng() < liftoffFailure ? "launch_vehicle" : null));
  if (cause) return fail("liftoff", cause);

  cause = yield* rollStage("ascent", ascentRocketPass * launchSurvival, () => {
    if (rng() > ascentRocketPass) return "launch_vehicle";
    if (rng() > launchSurvival) return "launch_loads";
    return null;
  });
  if (cause) return fail("ascent", cause);

  // 入軌（含 GTO 圓化或電推螺旋爬升穿越輻射帶）
  cause = yield* rollStage("insertion", analysis.stranded ? 0 : rel.surviveBelts, () => {
    if (analysis.stranded) return "insufficient_dv";
    if (rng() < 1 - rel.surviveBelts) return "radiation_belts";
    return null;
  });
  if (cause) return fail("insertion", cause);

  // 展開
  const mechanisms = [];
  for (let i = 0; i < design.parts.power.deployables; i++) mechanisms.push("array");
  for (let i = 0; i < design.parts.comm.deployables; i++) mechanisms.push("antenna");
  cause = yield* rollStage("deployment", rel.deploy, () => {
    for (const m of mechanisms) {
      if (rng() > DEPLOY_MECHANISM_RELIABILITY) return "deployment_" + m;
    }
    return null;
  });
  if (cause) return fail("deployment", cause);

  // 運作
  const life = design.orbit.designLifeYears;
  const ctx = {
    analysis,
    design,
    features,
    baseRate: (analysis.coreValue * analysis.delayFactor) / life,
    // 上限是「完整撐完設計壽命」的價值：延長任務只能補回故障損失的服務時間，
    // 不能讓解析度不夠的相機靠多拍幾年就變清楚
    valueCap: analysis.coreValue * analysis.delayFactor,
  };
  const dvPerYear = dvPerServiceYear(design.orbit);
  const dvReq = analysis.dvRequired;
  const dvYears = dvPerYear > 0 ? Math.max(0, (analysis.dv - dvReq.insert) / dvPerYear) : Infinity;
  state = { time: 0, multiplier: 1, reserveM: outcome.reserveLeftM, dvYears, dvPerYear, delivered: 0 };
  yield { kind: "stageStart", stageId: "operation", valueCap: ctx.valueCap, designLife: life };

  const hazards = Object.entries(rel.hazardBreakdown);
  const componentRate = rel.hazardPerYear;
  const opsRate = features.operations ? OPS_EVENT_RATE_PER_YEAR[design.orbit.id] : 0;
  const opsEvents = OPS_EVENTS.filter((e) => e.weight[design.orbit.id] > 0);
  const impactTime = rng() < rel.impactRisk ? rng() * life : Infinity;

  let end = Math.min(life, state.dvYears);
  let phase = "design";
  let lastYearTick = 0;

  const addValue = (amount) => {
    state.delivered = Math.max(0, Math.min(ctx.valueCap, state.delivered + amount));
    outcome.deliveredValue = state.delivered;
  };

  const accrueTo = function* (target) {
    while (state.time < target - 1e-12) {
      const nextTick = lastYearTick + 1;
      const stepEnd = Math.min(target, nextTick);
      addValue(ctx.baseRate * state.multiplier * (stepEnd - state.time));
      state.time = stepEnd;
      if (stepEnd >= nextTick - 1e-9) {
        lastYearTick = nextTick;
        yield { kind: "year", year: lastYearTick, phase, delivered: state.delivered, multiplier: state.multiplier };
      }
    }
  };

  const decide = function* (source, options) {
    const choices = decisionOptions(ctx, state, options);
    const index = yield { kind: "decision", source, choices, reserveM: state.reserveM, time: state.time, delivered: state.delivered };
    const chosen = choices[index].option;
    state.reserveM -= chosen.costM;
    const record = { source: source.id, option: chosen.id, succeeded: null };
    const effect = chosen.effect;

    if (effect.successChance !== undefined) {
      record.succeeded = rng() < effect.successChance;
      if (!record.succeeded) state = applyEffect(state, effect.onFail, state.time);
    } else {
      state = applyEffect(state, effect, state.time);
    }
    outcome.decisions.push(record);
    yield { kind: "decisionResult", source, option: chosen, succeeded: record.succeeded };

    if (effect.fatalChance && rng() < effect.fatalChance) return "collision";
    if (effect.lostYears) addValue(-ctx.baseRate * state.multiplier * effect.lostYears);
    if (effect.anomalyChance && rng() < effect.anomalyChance) {
      return yield* decide({ type: "component", id: COMPONENT_ANOMALIES.power.id, subsystem: "power" }, COMPONENT_ANOMALIES.power.options);
    }
    end = phase === "design" ? Math.min(life, state.dvYears) : Math.min(end, state.dvYears);
    return null;
  };

  while (true) {
    const totalRate = componentRate + opsRate;
    const nextEvent = state.time + sampleExp(totalRate, rng);
    const nextImpact = impactTime > state.time ? impactTime : Infinity;

    if (Math.min(nextEvent, nextImpact) >= end) {
      yield* accrueTo(end);

      if (phase === "design" && features.operations && end >= life - 1e-9) {
        // 只延長到補回損失的價值為止，任務目標達成就收工
        const rate = ctx.baseRate * state.multiplier;
        const neededYears = rate > 0 ? (ctx.valueCap - state.delivered) / rate : 0;
        const extYears = Math.min(
          state.reserveM / EXTENDED_MISSION_COST_PER_YEAR_M,
          life * EXTENSION_MAX_FRACTION,
          Math.max(0, state.dvYears - life),
          neededYears
        );
        if (extYears >= 0.25) {
          state.reserveM -= extYears * EXTENDED_MISSION_COST_PER_YEAR_M;
          phase = "extension";
          end = life + extYears;
          yield { kind: "extensionStart", years: extYears };
          continue;
        }
      }
      break;
    }

    if (nextImpact <= nextEvent) {
      yield* accrueTo(nextImpact);
      return fail("operation", "impact");
    }

    yield* accrueTo(nextEvent);
    const isComponent = rng() * totalRate < componentRate;

    if (isComponent) {
      const subsystem = pickByWeight(hazards, rng);
      if (!features.operations || rng() > RECOVERABLE_ANOMALY_SHARE) return fail("operation", "component_" + subsystem);
      const anomaly = COMPONENT_ANOMALIES[subsystem];
      const result = yield* decide({ type: "component", id: anomaly.id, subsystem }, anomaly.options);
      if (result === "collision") return fail("operation", "collision");
    } else {
      const eventId = pickByWeight(opsEvents.map((e) => [e.id, e.weight[design.orbit.id]]), rng);
      const event = opsEvents.find((e) => e.id === eventId);
      const result = yield* decide({ type: "ops", id: event.id }, event.options);
      if (result === "collision") return fail("operation", "collision");
    }
  }

  outcome.serviceYears = Math.min(state.time, life);
  outcome.extensionYears = Math.max(0, state.time - life);
  outcome.reserveLeftM = state.reserveM;
  outcome.propellantDepleted = state.time < life - 1e-6;
  return outcome;
}

// 讓時間軸跑完：決策交給精算策略
function runTimelineWithPolicy(analysis, design, features, rng) {
  const gen = missionTimeline(analysis, design, features, rng);
  let step = gen.next();
  while (!step.done) {
    step = step.value.kind === "decision" ? gen.next(actuarialChoice(step.value.choices)) : gen.next();
  }
  return step.value;
}

// 期望任務價值：沒有運作期決策時用解析公式；有的話用固定亂數種子的蒙地卡羅模擬
function computeExpectedValue(design, features, analysis = analyzeDesign(design)) {
  if (!analysis.complete) return 0;
  if (!features.operations) return analysis.expectedValue;
  const rng = makeRng(EV_SIMULATION_SEED);
  let sum = 0;
  for (let i = 0; i < EV_SIMULATION_RUNS; i++) {
    sum += runTimelineWithPolicy(analysis, design, features, rng).deliveredValue;
  }
  return sum / EV_SIMULATION_RUNS;
}
