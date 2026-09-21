// 遊戲數值資料（對照 docs/GDD.md 第 12 節「數值平衡表 v1」）
// 顯示用的名稱/敘述一律透過 js/i18n.js 的 t() 依 id 查詢，這裡只放數值本身。

const BUDGET_TOTAL = 100;

const ROCKETS = [
  { id: "light", cost: 20, maxPayload: 50, reliability: 60 },
  { id: "medium", cost: 35, maxPayload: 80, reliability: 75 },
  { id: "heavy", cost: 55, maxPayload: 120, reliability: 85 },
];

const SUBSYSTEMS = {
  power: {
    tiers: [
      { id: "economy", cost: 8, mass: 6, value: 35 },
      { id: "standard", cost: 15, mass: 10, value: 65 },
      { id: "premium", cost: 25, mass: 15, value: 90 },
    ],
  },
  comm: {
    tiers: [
      { id: "economy", cost: 8, mass: 5, value: 35 },
      { id: "standard", cost: 15, mass: 8, value: 65 },
      { id: "premium", cost: 25, mass: 12, value: 90 },
    ],
  },
  science: {
    tiers: [
      { id: "economy", cost: 8, mass: 7, value: 30 },
      { id: "standard", cost: 16, mass: 11, value: 60 },
      { id: "premium", cost: 28, mass: 16, value: 90 },
    ],
  },
  structure: {
    tiers: [
      { id: "economy", cost: 8, mass: 6, value: 35 },
      { id: "standard", cost: 14, mass: 10, value: 65 },
      { id: "premium", cost: 24, mass: 14, value: 90 },
    ],
  },
};

const SUBSYSTEM_KEYS = ["power", "comm", "science", "structure"];

// 燃料系統：燃料類型（決定質量/成本效率）× 填充量（0~100% 滑桿）
// 質量係數 = 220（聯胺比衝，基準）÷ 該燃料實際比衝，數字越小代表同樣推進力所需質量越輕
const FUEL_BASE_MASS_AT_FULL = 17; // MU，填充量 100% 時的基礎質量（尚未乘上燃料係數）
const FUEL_BASE_COST_AT_FULL = 22; // C，填充量 100% 時的基礎成本（尚未乘上燃料係數）
const FUEL_BASE_PROPULSION_AT_FULL = 90; // 填充量 100% 時的推進貢獻值

const FUELS = [
  { id: "hydrazine", isp: 220, massCoef: 1.0, costCoef: 1.0, electric: false, toxic: true },
  { id: "af_m315e", isp: 245, massCoef: 0.9, costCoef: 1.3, electric: false, toxic: false },
  { id: "hydrogen_peroxide", isp: 160, massCoef: 1.4, costCoef: 0.7, electric: false, toxic: false },
  { id: "ion", isp: 3000, massCoef: 0.07, costCoef: 1.8, electric: true, toxic: false },
  { id: "hall", isp: 1600, massCoef: 0.14, costCoef: 1.5, electric: true, toxic: false },
];

const HAZMAT_COST = 12; // C，聯胺毒氣危害處理加購成本
const HAZMAT_INCIDENT_CHANCE = 0.8; // 不加購時的工安事故機率
const HAZMAT_INCIDENT_PENALTY = 20; // C，事故發生時的額外清理成本（計入預算效率分數，不影響選件畫面的預算）

const ELECTRIC_UNDERPOWERED_MULTIPLIER = 0.6; // 電推進但電力系統 < 標準檔時的推進值懲罰倍率

const STAGES = [
  { id: "liftoff", baseThreshold: 50 },
  { id: "ascent", baseThreshold: 30 },
  { id: "insertion", baseThreshold: 30 },
  { id: "deployment", baseThreshold: 30 },
  { id: "operation", baseThreshold: 30 },
];

const EVENTS = [
  { id: "solar_flare", icon: "☀️", weight: 1, effect: { stage: "operation", stat: "comm", bonus: 25 } },
  { id: "geomagnetic_storm", icon: "🌩️", weight: 1, effect: { stage: "operation", stat: "power", bonus: 25 } },
  { id: "bad_weather", icon: "☁️", weight: 1, effect: { stage: "liftoff", stat: "reliability", bonus: 20 } },
  { id: "wind_shear", icon: "💨", weight: 1, effect: { stage: "ascent", stat: "structure", bonus: 25 } },
  { id: "micrometeorite", icon: "🌠", weight: 1, effect: { stage: "operation", addCheck: "structure", threshold: 30 } },
  { id: "orbital_congestion", icon: "🛰️", weight: 1, effect: { stage: "insertion", stat: "propulsion", bonus: 20 } },
  { id: "limited_ground_station", icon: "📡", weight: 1, effect: { stage: "operation", stat: "comm", bonus: 20 } },
  { id: "cold_snap", icon: "❄️", weight: 1, effect: { stage: "deployment", bonus: 20 } },
  { id: "budget_cut", icon: "💰", weight: 1, effect: { budgetDelta: -20 } },
  { id: "nominal", icon: "🌤️", weight: 3, effect: {} },
];

function failureRateFromMargin(margin) {
  if (margin < 0) return 1.0;
  if (margin < 10) return 0.25;
  if (margin < 30) return 0.10;
  if (margin < 60) return 0.05;
  return 0.02;
}

function pickRandomEvent() {
  const totalWeight = EVENTS.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const event of EVENTS) {
    roll -= event.weight;
    if (roll <= 0) return event;
  }
  return EVENTS[EVENTS.length - 1];
}
