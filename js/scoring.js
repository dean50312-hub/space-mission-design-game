// 精算評分：玩家設計的期望價值 ÷ 同一個任務、同樣條件下的理論最佳期望值。
// 評的是決策品質，不是運氣——同一個設計不管擲骰結果如何，分數都一樣。
// 理論最佳由 tools/best-designs.html 窮舉所有設計後寫進 js/bestdesigns.js（BEST_DESIGNS）。

const SCORE_GRADES = [
  { id: "S", min: 95 },
  { id: "A", min: 85 },
  { id: "B", min: 70 },
  { id: "C", min: 50 },
  { id: "D", min: 0 },
];

// 劇情關卡：交付夠多價值，或設計本身夠好（運氣差但決策正確）都能過關
const CAMPAIGN_PASS_SCORE = 85;

// 推進劑候選量：以「自動計算」的量為基準上下調整
const SEARCH_PROPELLANT_FACTORS = [0.6, 0.8, 0.9, 1, 1.15, 1.3, 1.6, 2];
// 有運作期決策時，先用解析公式篩出前幾名，再用少量蒙地卡羅排序，最後用正式的 800 次決定
const SEARCH_ANALYTIC_POOL = 400;
const SEARCH_QUICK_RUNS = 120;
const SEARCH_FINALISTS = 15;

function featureKey(features) {
  return `f${features.fuel ? 1 : 0}o${features.operations ? 1 : 0}`;
}

function scenarioKey(objective, event, features) {
  return `${objective.id}|${event ? event.id : "none"}|${featureKey(features)}`;
}

// 遊戲裡可能出現的所有情境（任務目標 × 事件 × 開放的機制）
function allScenarios() {
  const seen = new Map();
  [1, 2, 3, 4, null].forEach((level) => {
    const features = getCampaignFeatures(level);
    let events = [null];
    if (features.events) {
      events = features.forcedEventId ? [EVENTS.find((e) => e.id === features.forcedEventId)] : EVENTS;
    }
    MISSION_OBJECTIVES.forEach((objective) => {
      events.forEach((event) => {
        const key = scenarioKey(objective, event, features);
        if (!seen.has(key)) seen.set(key, { key, objective, event, features });
      });
    });
  });
  return [...seen.values()];
}

function* candidateDesigns(objective, event, features) {
  const budgetDelta = (event && event.effect.budgetDeltaM) || 0;
  for (const orbit of ORBITS) {
    const budgetM = MISSION_BUDGET_BY_ORBIT[orbit.id] + budgetDelta;
    const fuels = features.fuel ? FUELS : [defaultFuelForOrbit(orbit.id)];
    for (const rocket of ROCKETS) {
      for (const power of SUBSYSTEMS.power) {
        for (const comm of SUBSYSTEMS.comm) {
          for (const payload of payloadOptionsFor(objective)) {
            for (const structure of SUBSYSTEMS.structure) {
              for (const fuel of fuels) {
                const base = { objective, orbit, event, budgetM, rocket, parts: { power, comm, payload, structure }, fuel, propellantKg: 0 };
                const auto = autoPropellantKg(base);
                const amounts = features.fuel
                  ? [...new Set(SEARCH_PROPELLANT_FACTORS.map((f) => Math.min(PROPELLANT_MAX_KG, Math.round((auto * f) / PROPELLANT_STEP_KG) * PROPELLANT_STEP_KG)))]
                  : [auto];
                for (const propellantKg of amounts) yield { ...base, propellantKg };
              }
            }
          }
        }
      }
    }
  }
}

function summarizeDesign(design, ev, analysis) {
  return {
    ev,
    orbit: design.orbit.id,
    rocket: design.rocket.id,
    parts: Object.fromEntries(SUBSYSTEM_KEYS.map((key) => [key, design.parts[key].id])),
    fuel: design.fuel.id,
    propellantKg: design.propellantKg,
    costM: Math.round(analysis.costM * 10) / 10,
    budgetM: design.budgetM,
  };
}

// 窮舉找出期望價值最高的設計；filter 可以加額外條件（例如勳章的門檻）
function searchBestDesign(objective, event, features, filter) {
  const scored = [];
  for (const design of candidateDesigns(objective, event, features)) {
    const analysis = analyzeDesign(design);
    if (isLaunchBlocked(analysis)) continue;
    if (filter && !filter(design, analysis)) continue;
    scored.push({ design, analysis, quick: analysis.expectedValue });
  }
  if (scored.length === 0) return null;
  scored.sort((a, b) => b.quick - a.quick);

  if (!features.operations) {
    const top = scored[0];
    return summarizeDesign(top.design, top.quick, top.analysis);
  }

  const pool = scored.slice(0, SEARCH_ANALYTIC_POOL);
  pool.forEach((s) => {
    s.mc = computeExpectedValue(s.design, features, s.analysis, SEARCH_QUICK_RUNS);
  });
  pool.sort((a, b) => b.mc - a.mc);
  let best = null;
  pool.slice(0, SEARCH_FINALISTS).forEach((s) => {
    const ev = computeExpectedValue(s.design, features, s.analysis);
    if (!best || ev > best.ev) best = { ...s, ev };
  });
  return summarizeDesign(best.design, best.ev, best.analysis);
}

// 所有會影響最佳設計的平衡數值。只要有任何一個改了，js/bestdesigns.js 就過期了
function balanceFingerprint() {
  const text = JSON.stringify([
    MISSION_BUDGET_BY_ORBIT, ORBITS, ROCKETS, BUS_CORE, GRADE_RELIABILITY_LEO_5YR, DEPLOY_MECHANISM_RELIABILITY,
    SUBSYSTEMS, PAYLOADS, FUELS, TOXIC_HANDLING_COST_M, PROPELLANT_MAX_KG, PROPELLANT_STEP_KG, AUTO_PROPELLANT_MARGIN,
    ELECTRIC_TRANSFER_DV_FACTOR, ELECTRIC_TRANSFER_YEARS, RADIATION_BELT_FACTOR, LIFTOFF_SHARE_OF_LAUNCH_FAILURE,
    MISSION_OBJECTIVES, EXTENDED_MISSION_COST_PER_YEAR_M, EXTENSION_MAX_FRACTION, RECOVERABLE_ANOMALY_SHARE,
    OPS_EVENT_RATE_PER_YEAR, EV_SIMULATION_RUNS, EV_SIMULATION_SEED, COMPONENT_ANOMALIES, OPS_EVENTS, EVENTS,
    SEARCH_PROPELLANT_FACTORS, SEARCH_ANALYTIC_POOL, SEARCH_QUICK_RUNS, SEARCH_FINALISTS,
  ]);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

const runtimeBestDesigns = {};

// 先查預先算好的表；表過期或缺項時當場窮舉（約 1 秒），並記在記憶體裡
function bestDesignFor(objective, event, features) {
  const key = scenarioKey(objective, event, features);
  const tableValid =
    typeof BEST_DESIGNS !== "undefined" &&
    typeof BEST_DESIGNS_FINGERPRINT !== "undefined" &&
    BEST_DESIGNS_FINGERPRINT === balanceFingerprint();
  if (tableValid && BEST_DESIGNS[key]) return BEST_DESIGNS[key];
  if (!(key in runtimeBestDesigns)) {
    if (!tableValid) console.warn("js/bestdesigns.js 已過期，請用 tools/best-designs.html 重新產生");
    runtimeBestDesigns[key] = searchBestDesign(objective, event, features);
  }
  return runtimeBestDesigns[key];
}

// 0–100 分。萬一玩家找到比窮舉結果更好的設計，就以玩家為準給滿分
function actuarialScore(expectedValue, best) {
  if (!best || best.ev <= 0) return null;
  return Math.round(100 * Math.min(1, expectedValue / best.ev));
}

function scoreGrade(score) {
  return SCORE_GRADES.find((g) => score >= g.min).id;
}

// ---------- 挑戰勳章：每種任務目標 3 枚，只看設計，不看運氣 ----------
// 門檻都用 tools/best-designs.html 驗證過：在一般情境下拿得到，但要刻意取捨

const FRUGAL_BUDGET_SHARE = 0.7;
const FRUGAL_MIN_SCORE = { imaging: 75, climate: 70, weather: 85, comms: 45 };
const ROBUST_FULL_SUCCESS = 0.92;
const ROBUST_MIN_SCORE = 65;
const ELECTRIC_MIN_SCORE = { weather: 90, comms: 75 };

const MEDALS = [
  {
    id: "s_rank",
    icon: "🥇",
    params: () => ({ minScore: 95 }),
    meets: () => true,
  },
  {
    id: "frugal",
    icon: "💡",
    params: (objective) => ({ minScore: FRUGAL_MIN_SCORE[objective.id], share: FRUGAL_BUDGET_SHARE }),
    meets: (design, analysis, p) => analysis.costM <= analysis.budgetM * p.share,
  },
  {
    // 可靠度不是免費的：要把完全成功機率拉到很高，通常得犧牲任務價值
    id: "robust",
    icon: "🛡️",
    objectives: ["imaging", "climate"],
    params: () => ({ minScore: ROBUST_MIN_SCORE, fullSuccess: ROBUST_FULL_SUCCESS }),
    meets: (design, analysis, p) => analysis.fullSuccess >= p.fullSuccess,
  },
  {
    // 全電推進衛星（如 Boeing 702SP）：省下大量推進劑，代價是花半年爬升到 GEO
    id: "all_electric",
    icon: "⚡",
    objectives: ["weather", "comms"],
    params: (objective) => ({ minScore: ELECTRIC_MIN_SCORE[objective.id] }),
    meets: (design) => design.fuel.electric,
  },
];

function medalsFor(objective) {
  return MEDALS.filter((m) => !m.objectives || m.objectives.includes(objective.id));
}

function evaluateMedals(objective, { score, design, analysis }) {
  return medalsFor(objective).map((medal) => {
    const params = medal.params(objective);
    const earnedNow = score !== null && score >= params.minScore && medal.meets(design, analysis, params);
    const earnedBefore = storageHasMedal(objective.id, medal.id);
    if (earnedNow && !earnedBefore) storageAwardMedal(objective.id, medal.id);
    return { medal, params, earnedNow, isNew: earnedNow && !earnedBefore, owned: earnedNow || earnedBefore };
  });
}
