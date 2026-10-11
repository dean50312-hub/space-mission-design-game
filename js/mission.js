// 任務模型：把一組設計（軌道、火箭、零件、推進劑）換算成真實的工程預算、任務價值與成功機率。
// 選件畫面的即時儀表、模擬擲骰、結果頁的事後分析都共用這裡的計算。

function findOrbit(id) {
  return ORBITS.find((o) => o.id === id);
}

function gradeHazardPerYear(grade) {
  return -Math.log(GRADE_RELIABILITY_LEO_5YR[grade]) / GRADE_REFERENCE_YEARS;
}

function payloadOptionsFor(objective) {
  return PAYLOADS[objective.payloadKind];
}

function defaultFuelForOrbit(orbitId) {
  return FUELS.find((f) => f.id === (orbitId === "geo" ? "biprop" : "hydrazine"));
}

function currentDesign() {
  return {
    objective: gameState.missionObjective,
    orbit: gameState.orbit,
    event: gameState.event,
    budgetM: gameState.budget,
    rocket: gameState.rocket,
    parts: { ...gameState.parts },
    fuel: gameState.fuel,
    propellantKg: gameState.propellantKg,
  };
}

function eventEffect(design) {
  return (design.event && design.event.effect) || {};
}

function designCostM(design) {
  let cost = BUS_CORE.costM;
  if (design.rocket) cost += design.rocket.costM;
  SUBSYSTEM_KEYS.forEach((key) => {
    if (design.parts[key]) cost += design.parts[key].costM;
  });
  if (design.fuel) {
    cost += design.fuel.costM;
    if (design.fuel.toxic) cost += TOXIC_HANDLING_COST_M;
  }
  return cost;
}

function designDryMassKg(design) {
  let mass = BUS_CORE.massKg;
  ["power", "comm", "payload"].forEach((key) => {
    if (design.parts[key]) mass += design.parts[key].massKg;
  });
  if (design.fuel) mass += design.fuel.dryMassKg;
  const structureFraction = design.parts.structure ? design.parts.structure.massFraction : 0;
  mass *= 1 + structureFraction;
  mass *= eventEffect(design).dryMassMultiplier || 1;
  return mass;
}

function launchCapacityKg(design) {
  if (!design.rocket || !design.orbit) return 0;
  return design.rocket.capacityKg[design.orbit.capacityKey];
}

function deltaVKmS(isp, wetKg, dryKg) {
  if (dryKg <= 0 || wetKg <= dryKg) return 0;
  return (isp * G0 * Math.log(wetKg / dryKg)) / 1000;
}

function requiredDeltaV(design) {
  const orbit = design.orbit;
  const electric = Boolean(design.fuel && design.fuel.electric);
  const insert = orbit.dvInsertKmS * (electric ? ELECTRIC_TRANSFER_DV_FACTOR : 1);
  const extra = orbit.id === "leo" ? eventEffect(design).leoExtraDvKmS || 0 : 0;
  const ops = orbit.dvOpsKmS + extra;
  return { insert, ops, total: insert + ops };
}

function autoPropellantKg(design) {
  if (!design.fuel || !design.orbit) return 0;
  const dry = designDryMassKg(design);
  const target = requiredDeltaV(design).total * (1 + AUTO_PROPELLANT_MARGIN);
  const ratio = Math.exp((target * 1000) / (design.fuel.isp * G0));
  const kg = dry * (ratio - 1);
  return Math.min(PROPELLANT_MAX_KG, Math.ceil(kg / PROPELLANT_STEP_KG) * PROPELLANT_STEP_KG);
}

function groundSampleDistanceM(apertureM, altitudeKm) {
  return (1.22 * VISIBLE_WAVELENGTH_M * altitudeKm * 1000) / apertureM;
}

function isDesignComplete(design) {
  return Boolean(
    design.objective &&
      design.orbit &&
      design.rocket &&
      design.fuel &&
      SUBSYSTEM_KEYS.every((key) => design.parts[key])
  );
}

function analyzeDesign(design) {
  const effect = eventEffect(design);
  const costM = designCostM(design);
  const dryKg = designDryMassKg(design);
  const wetKg = dryKg + (design.fuel ? design.propellantKg : 0);
  const capacityKg = launchCapacityKg(design);

  const analysis = {
    complete: isDesignComplete(design),
    costM,
    budgetM: design.budgetM,
    dryKg,
    wetKg,
    capacityKg,
    overBudget: costM > design.budgetM,
    overMass: Boolean(design.rocket) && wetKg > capacityKg,
    noCapacity: Boolean(design.rocket) && capacityKg <= 0,
    unavailable: usesUnavailableOption(design),
  };

  if (!design.orbit) return analysis;
  const orbit = design.orbit;
  const { power, comm, payload, structure } = design.parts;

  analysis.powerLoadW = BUS_CORE.powerW + (payload ? payload.powerW : 0) + (comm ? comm.powerW : 0);
  analysis.powerAvailW = power ? power.powerW * orbit.sunlightFactor : 0;

  if (design.fuel) {
    analysis.dv = deltaVKmS(design.fuel.isp, wetKg, dryKg);
    analysis.dvRequired = requiredDeltaV(design);
  }

  if (payload && design.objective.payloadKind === "optical") {
    analysis.gsdM = groundSampleDistanceM(payload.apertureM, orbit.altitudeKm);
    analysis.dataGenGbit = payload.dataGbitPerDay;
  }
  if (comm) {
    const contact = orbit.contactHoursPerDay * (orbit.id === "leo" ? effect.leoContactMultiplier || 1 : 1);
    analysis.dataDownGbit = comm.rateMbps[orbit.id] * contact * 3.6;
  }

  if (!analysis.complete) return analysis;

  const objective = design.objective;
  const req = objective.requirement;

  let performance;
  if (req.type === "throughput") {
    performance = Math.sqrt(Math.min(1, payload.throughputGbps / req.gbps));
  } else if (req.type === "resolution") {
    performance = Math.sqrt(Math.min(1, req.maxGsdM / analysis.gsdM));
  } else {
    performance = Math.sqrt(Math.min(1, payload.bands / req.bands) * Math.min(1, req.maxGsdM / analysis.gsdM));
  }

  const delivery =
    objective.payloadKind === "optical" ? Math.min(1, analysis.dataDownGbit / analysis.dataGenGbit) : 1;
  const powerFactor = Math.min(1, analysis.powerAvailW / analysis.powerLoadW);

  const electricTransfer = orbit.id === "geo" && design.fuel.electric;
  const transferYears = electricTransfer
    ? ELECTRIC_TRANSFER_YEARS * Math.max(1, design.fuel.powerW / Math.max(analysis.powerAvailW, 1))
    : 0;

  const dvReq = analysis.dvRequired;
  const stranded = dvReq.insert > 0 && analysis.dv < dvReq.insert;
  const dvLifeFactor = dvReq.ops > 0 ? Math.max(0, Math.min(1, (analysis.dv - dvReq.insert) / dvReq.ops)) : 1;
  const delayFactor = (orbit.designLifeYears - transferYears) / orbit.designLifeYears;
  const lifetime = stranded ? 0 : dvLifeFactor * delayFactor;

  const coverage = objective.coverage[orbit.id];
  const value = coverage * performance * delivery * powerFactor * lifetime;

  const rocketR = rocketReliability(design.rocket);
  const launch = rocketR * structure.launchSurvival;
  const deploy = Math.pow(DEPLOY_MECHANISM_RELIABILITY, power.deployables + comm.deployables);

  const powerHazardMultiplier = orbit.id === "geo" ? effect.geoPowerHazardMultiplier || 1 : 1;
  const environment = orbit.radiationFactor * structure.radiationMultiplier * (effect.radiationMultiplier || 1);
  const hazardBreakdown = {
    power: gradeHazardPerYear(power.grade) * powerHazardMultiplier * environment,
    comm: gradeHazardPerYear(comm.grade) * environment,
    payload: gradeHazardPerYear(payload.grade) * environment,
    propulsion: gradeHazardPerYear("qualified") * environment,
    bus: gradeHazardPerYear(BUS_CORE.grade) * environment,
  };
  const hazard = Object.values(hazardBreakdown).reduce((sum, h) => sum + h, 0);

  const beltYears = transferYears * RADIATION_BELT_FACTOR;
  const lifeYears = orbit.designLifeYears * dvLifeFactor;
  const surviveBelts = Math.exp(-hazard * beltYears);
  const surviveLife = Math.exp(-hazard * lifeYears);
  const impactRisk = effect.impactCheck ? structure.impactRisk : 0;

  const serviceFraction =
    lifeYears > 0 ? (surviveBelts * (1 - surviveLife)) / (hazard * lifeYears) : 0;
  const expectedFraction = serviceFraction * (1 - impactRisk / 2);

  const expectedValue = stranded ? 0 : launch * deploy * value * expectedFraction;
  const fullSuccess = stranded ? 0 : launch * deploy * surviveBelts * surviveLife * (1 - impactRisk);

  Object.assign(analysis, {
    factors: { coverage, performance, delivery, power: powerFactor, lifetime },
    coreValue: coverage * performance * delivery * powerFactor,
    value,
    stranded,
    transferYears,
    delayFactor,
    dvLifeFactor,
    reliability: {
      rocket: rocketR,
      launch,
      deploy,
      hazardPerYear: hazard,
      hazardBreakdown,
      beltYears,
      lifeYears,
      surviveBelts,
      surviveLife,
      impactRisk,
    },
    expectedFraction,
    expectedValue,
    fullSuccess,
  });
  return analysis;
}

function usesUnavailableOption(design) {
  if (design.rocket && !isOptionAvailable(design.event, "rocket", design.rocket)) return true;
  return SUBSYSTEM_KEYS.some((key) => design.parts[key] && !isOptionAvailable(design.event, key, design.parts[key]));
}

function isLaunchBlocked(analysis) {
  return !analysis.complete || analysis.overBudget || analysis.overMass || analysis.noCapacity || analysis.unavailable;
}

// 事後分析：只改一個選項（換火箭／換某個零件等級／換推進系統），找出期望價值提升最多的那個
function bestSingleChange(design, features) {
  const baseScore = computeExpectedValue(design, features);
  let best = null;

  // 換零件會改變乾質量，所以同時評估「推進劑不變」與「推進劑重新計算」兩種做法
  const consider = (variant, change) => {
    const candidates = [];
    if (features.fuel) candidates.push({ variant, autoPropellant: false });
    const autoVariant = { ...variant };
    autoVariant.propellantKg = autoPropellantKg(autoVariant);
    candidates.push({ variant: autoVariant, autoPropellant: true });

    candidates.forEach(({ variant: v, autoPropellant }) => {
      const a = analyzeDesign(v);
      if (isLaunchBlocked(a)) return;
      const score = computeExpectedValue(v, features, a);
      if (!best || score > best.score) {
        best = { change: { ...change, autoPropellant, propellantKg: v.propellantKg }, score };
      }
    });
  };

  ROCKETS.forEach((rocket) => {
    if (rocket !== design.rocket) consider({ ...design, rocket }, { kind: "rocket", to: rocket });
  });
  SUBSYSTEM_KEYS.forEach((key) => {
    const options = key === "payload" ? payloadOptionsFor(design.objective) : SUBSYSTEMS[key];
    options.forEach((tier) => {
      if (tier === design.parts[key]) return;
      consider({ ...design, parts: { ...design.parts, [key]: tier } }, { kind: "part", key, from: design.parts[key], to: tier });
    });
  });
  if (features.fuel) {
    FUELS.forEach((fuel) => {
      if (fuel !== design.fuel) consider({ ...design, fuel }, { kind: "fuel", to: fuel });
    });
    consider({ ...design }, { kind: "propellant" });
  }

  if (!best || best.score <= baseScore + 0.01) return null;
  return { ...best, baseScore };
}
