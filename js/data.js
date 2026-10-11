// 遊戲資料：所有數值都對照真實太空工程，來源記錄在 docs/REFERENCES.md。
// 顯示用文字一律透過 js/i18n.js 的 t() 依 id 查詢，這裡只放數值。

const G0 = 9.80665; // m/s²，標準重力加速度（火箭方程式用）
const VISIBLE_WAVELENGTH_M = 550e-9; // 可見光波長，用於繞射極限解析度

// 任務預算（百萬美元）依軌道而定：GEO 衛星較大、較貴
const MISSION_BUDGET_BY_ORBIT = { leo: 210, geo: 230 };

const ORBITS = [
  {
    id: "leo",
    altitudeKm: 550,
    designLifeYears: 5,
    dvInsertKmS: 0,
    dvOpsKmS: 0.15, // 軌道維持＋任務結束後 5 年內離軌（FCC 規定）
    sunlightFactor: 0.62, // 每圈約 35 分鐘在地球陰影中
    contactHoursPerDay: 0.6, // 單一地面站每天約 3–4 次、每次約 10 分鐘
    radiationFactor: 1.0,
    capacityKey: "leo",
  },
  {
    id: "geo",
    altitudeKm: 35786,
    designLifeYears: 15,
    dvInsertKmS: 1.83, // 從卡納維爾角（傾角 28.5°）的 GTO 圓化成 GEO
    dvOpsKmS: 0.75, // 南北位置保持約 50 m/s/年 × 15 年
    sunlightFactor: 0.85, // 幾乎全日照，但太陽能板 15 年會衰退
    contactHoursPerDay: 24,
    radiationFactor: 1.5, // 位於外范艾倫帶邊緣，輻射環境比 LEO 嚴苛
    capacityKey: "gto",
  },
];

// 火箭：真實價格與運力（可回收構型），可靠度用飛行紀錄以拉普拉斯接續法則估計
const ROCKETS = [
  { id: "light", costM: 7.5, capacityKg: { leo: 200, gto: 0 }, flights: 88, successes: 84 },
  { id: "medium", costM: 74, capacityKg: { leo: 17500, gto: 5500 }, flights: 690, successes: 687 },
  { id: "heavy", costM: 97, capacityKg: { leo: 57000, gto: 8000 }, flights: 13, successes: 13 },
];

// 拉普拉斯接續法則：(成功次數 + 1) / (總次數 + 2)
function rocketReliability(rocket) {
  return (rocket.successes + 1) / (rocket.flights + 2);
}

// 衛星本體（電腦、姿態控制、熱控）：每顆衛星都需要，不讓玩家選
const BUS_CORE = { massKg: 40, powerW: 60, costM: 8, grade: "qualified" };

// 零件等級：商規（COTS）／太空級（qualified）／太空級＋冗餘備份（redundant）
// 數值為「在 LEO 運作 5 年仍正常」的機率，其他軌道與年限依故障率換算
const GRADE_RELIABILITY_LEO_5YR = { cots: 0.9, qualified: 0.97, redundant: 0.995 };
const GRADE_REFERENCE_YEARS = 5;
const DEPLOY_MECHANISM_RELIABILITY = 0.99; // 每個需要展開的機構（太陽能板、天線）

const SUBSYSTEMS = {
  power: [
    { id: "economy", powerW: 150, massKg: 12, costM: 1.5, grade: "cots", deployables: 0 },
    { id: "standard", powerW: 5000, massKg: 150, costM: 15, grade: "qualified", deployables: 1 },
    { id: "premium", powerW: 20000, massKg: 400, costM: 40, grade: "redundant", deployables: 1 },
  ],
  comm: [
    // 下傳速率（Mbps）：同樣硬體到 GEO 距離變成約 65 倍，訊號剩約 1/4,200（平方反比）
    { id: "economy", rateMbps: { leo: 5, geo: 0.0012 }, powerW: 15, massKg: 2, costM: 0.5, grade: "cots", deployables: 0 },
    { id: "standard", rateMbps: { leo: 800, geo: 0.19 }, powerW: 120, massKg: 25, costM: 6, grade: "qualified", deployables: 1 },
    { id: "premium", rateMbps: { leo: 2000, geo: 130 }, powerW: 250, massKg: 60, costM: 18, grade: "redundant", deployables: 1 },
  ],
  structure: [
    // 結構質量為其他乾質量的比例；輻射倍率越低代表屏蔽越好
    { id: "economy", massFraction: 0.1, costM: 1, radiationMultiplier: 1.6, launchSurvival: 0.97, impactRisk: 0.08 },
    { id: "standard", massFraction: 0.18, costM: 5, radiationMultiplier: 1.0, launchSurvival: 0.995, impactRisk: 0.03 },
    { id: "premium", massFraction: 0.25, costM: 12, radiationMultiplier: 0.6, launchSurvival: 0.999, impactRisk: 0.01 },
  ],
};

// 任務酬載依任務類型而不同：光學相機／望遠鏡，或通訊轉發器
const PAYLOADS = {
  optical: [
    { id: "economy", apertureM: 0.09, bands: 4, dataGbitPerDay: 20, powerW: 20, massKg: 5, costM: 2, grade: "cots" },
    { id: "standard", apertureM: 0.5, bands: 16, dataGbitPerDay: 500, powerW: 250, massKg: 200, costM: 35, grade: "qualified" },
    { id: "premium", apertureM: 1.1, bands: 29, dataGbitPerDay: 3000, powerW: 600, massKg: 700, costM: 80, grade: "redundant" },
  ],
  transponder: [
    { id: "economy", throughputGbps: 1, powerW: 1500, massKg: 250, costM: 20, grade: "cots" },
    { id: "standard", throughputGbps: 10, powerW: 4500, massKg: 600, costM: 50, grade: "qualified" },
    { id: "premium", throughputGbps: 100, powerW: 12000, massKg: 1400, costM: 90, grade: "redundant" },
  ],
};

const SUBSYSTEM_KEYS = ["power", "comm", "payload", "structure"];
const TIER_IDS = ["economy", "standard", "premium"];

// 推進系統：比衝（Isp）決定同樣推進劑能產生多少 Δv
const FUELS = [
  { id: "hydrazine", isp: 220, dryMassKg: 15, costM: 2, electric: false, powerW: 0, toxic: true },
  { id: "af_m315e", isp: 245, dryMassKg: 15, costM: 3, electric: false, powerW: 0, toxic: false },
  { id: "biprop", isp: 320, dryMassKg: 40, costM: 5, electric: false, powerW: 0, toxic: true },
  { id: "hall", isp: 1600, dryMassKg: 35, costM: 8, electric: true, powerW: 1350, toxic: false },
  { id: "ion", isp: 3100, dryMassKg: 50, costM: 12, electric: true, powerW: 2300, toxic: false },
];

const TOXIC_HANDLING_COST_M = 2; // 毒性推進劑加注需要 SCAPE 防護作業
const PROPELLANT_MAX_KG = 6000;
const PROPELLANT_STEP_KG = 25;
const AUTO_PROPELLANT_MARGIN = 0.1; // 「自動計算」預留 10% Δv 餘量

// 電推進：低推力螺旋爬升比脈衝式轉移多耗 Δv，而且要花數個月穿越范艾倫輻射帶
const ELECTRIC_TRANSFER_DV_FACTOR = 1.3;
const ELECTRIC_TRANSFER_YEARS = 0.5;
const RADIATION_BELT_FACTOR = 3;

const STAGES = [
  { id: "liftoff" },
  { id: "ascent" },
  { id: "insertion" },
  { id: "deployment" },
  { id: "operation" },
];

// 火箭升空動畫每個階段抵達後的場景高度（%）
const STAGE_TARGET_PERCENT_BY_ID = {
  liftoff: 18,
  ascent: 40,
  insertion: 62,
  deployment: 78,
  operation: 92,
};

// 發射失敗中，約 3 成發生在剛起飛，其餘在爬升段
const LIFTOFF_SHARE_OF_LAUNCH_FAILURE = 0.3;

// 任務目標：每種任務在不同軌道的「覆蓋率」都來自真實幾何限制
const MISSION_OBJECTIVES = [
  {
    id: "imaging",
    payloadKind: "optical",
    coverage: { leo: 1, geo: 1 },
    requirement: { type: "resolution", maxGsdM: 0.5 },
  },
  {
    id: "climate",
    payloadKind: "optical",
    coverage: { leo: 1, geo: 0.42 }, // GEO 只看得到 42% 的地球，看不到南北緯 81° 以上
    requirement: { type: "bands", bands: 29, maxGsdM: 1000 },
  },
  {
    id: "weather",
    payloadKind: "optical",
    coverage: { leo: 2 / 144, geo: 1 }, // 需要每 10 分鐘一張（每天 144 張），LEO 每天只經過約 2 次
    requirement: { type: "bands", bands: 16, maxGsdM: 2000 },
  },
  {
    id: "comms",
    payloadKind: "transponder",
    coverage: { leo: 35 / 1440, geo: 1 }, // 單顆 LEO 衛星每天只在頭頂出現約 35 分鐘
    requirement: { type: "throughput", gbps: 30 },
  },
];

// 劇情關卡過關門檻：交付的任務價值
const CAMPAIGN_PASS_VALUE = 0.5;

// 戰役關卡的 feature flag。level 為 null 代表自由遊玩（全開）。
function getCampaignFeatures(level) {
  if (!level) return { orbit: true, fuel: true, events: true, operations: true, forcedEventId: null };
  return {
    orbit: true,
    fuel: level >= 2,
    events: level >= 3,
    operations: level >= 4,
    forcedEventId: level === 3 ? "solar_flare" : null,
  };
}

// ---------- 運作期：預備金、異常決策、延長任務 ----------

const EXTENDED_MISSION_COST_PER_YEAR_M = 4; // 延長任務每年的地面操作成本
const EXTENSION_MAX_FRACTION = 0.5; // 延長任務最多設計壽命的一半
const RECOVERABLE_ANOMALY_SHARE = 0.6; // 零件故障中能靠地面團隊挽救的比例
const OPS_EVENT_RATE_PER_YEAR = { leo: 0.3, geo: 0.1 };
const EV_SIMULATION_RUNS = 800;
const EV_SIMULATION_SEED = 20261115;

// 零件故障的應變選項。effect 欄位：
//   multiply：任務價值產出倍率；lifeMultiply：剩餘推進劑壽命倍率
//   successChance + onFail：有機率失敗的修復
const COMPONENT_ANOMALIES = {
  power: {
    id: "battery_fade",
    options: [
      { id: "reconfigure", costM: 6, effect: {} },
      { id: "reduce_duty", costM: 0, effect: { multiply: 0.5 } },
    ],
  },
  comm: {
    id: "transmitter_fault",
    options: [
      { id: "big_antenna", costM: 4, effect: { multiply: 0.8 } },
      { id: "low_gain", costM: 0, effect: { multiply: 0.25 } },
    ],
  },
  payload: {
    id: "instrument_fault",
    options: [
      { id: "patch", costM: 8, effect: { successChance: 0.5, onFail: { multiply: 0.78 } } },
      { id: "degraded", costM: 0, effect: { multiply: 0.78 } },
    ],
  },
  propulsion: {
    id: "valve_stuck",
    options: [
      { id: "new_procedure", costM: 5, effect: {} },
      { id: "backup_thrusters", costM: 0, effect: { lifeMultiply: 0.7 } },
    ],
  },
  bus: {
    id: "reaction_wheel",
    options: [
      { id: "new_software", costM: 10, effect: { multiply: 0.9 } },
      { id: "solar_pressure", costM: 0, effect: { multiply: 0.6 } },
    ],
  },
};

// 非故障的運作期事件
const OPS_EVENTS = [
  {
    id: "conjunction",
    weight: { leo: 3, geo: 1 },
    options: [
      { id: "maneuver", costM: 0, effect: { dvCostKmS: 0.01 } },
      { id: "accept_risk", costM: 0, effect: { fatalChance: 0.002 } },
    ],
  },
  {
    id: "storm_warning",
    weight: { leo: 2, geo: 2 },
    options: [
      { id: "safe_mode", costM: 0, effect: { lostYears: 3 / 365 } },
      { id: "keep_operating", costM: 0, effect: { anomalyChance: 0.05 } },
    ],
  },
  {
    id: "ground_outage",
    weight: { leo: 2, geo: 0 },
    options: [
      { id: "rent_network", costM: 2, effect: {} },
      { id: "wait_repair", costM: 0, effect: { lostYears: 30 / 365 } },
    ],
  },
];

const EVENTS = [
  { id: "solar_flare", icon: "☀️", weight: 1, effect: { radiationMultiplier: 1.5 } },
  { id: "geomagnetic_storm", icon: "🌩️", weight: 1, effect: { leoExtraDvKmS: 0.05, geoPowerHazardMultiplier: 2 } },
  { id: "bad_weather", icon: "⛈️", weight: 1, effect: { budgetDeltaM: -5 } },
  { id: "small_debris", icon: "🌠", weight: 1, effect: { impactCheck: true } },
  { id: "orbital_congestion", icon: "🛰️", weight: 1, effect: { leoExtraDvKmS: 0.03 } },
  { id: "limited_ground_station", icon: "📡", weight: 1, effect: { leoContactMultiplier: 0.5 } },
  { id: "mass_growth", icon: "⚖️", weight: 1, effect: { dryMassMultiplier: 1.15 } },
  { id: "budget_cut", icon: "💰", weight: 1, effect: { budgetDeltaM: -20 } },
  { id: "nominal", icon: "🌤️", weight: 3, effect: {} },
];

function pickRandomEvent(forcedId) {
  if (forcedId) return EVENTS.find((e) => e.id === forcedId) || EVENTS[EVENTS.length - 1];

  const totalWeight = EVENTS.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const event of EVENTS) {
    roll -= event.weight;
    if (roll <= 0) return event;
  }
  return EVENTS[EVENTS.length - 1];
}
