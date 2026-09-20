// 遊戲數值資料（對照 docs/GDD.md 第 12 節「數值平衡表 v1」）

const BUDGET_TOTAL = 100;

const ROCKETS = [
  { id: "light", name: "輕型火箭", cost: 20, maxPayload: 50, reliability: 60 },
  { id: "medium", name: "中型火箭", cost: 35, maxPayload: 80, reliability: 75 },
  { id: "heavy", name: "重型火箭", cost: 55, maxPayload: 120, reliability: 85 },
];

const SUBSYSTEMS = {
  power: {
    name: "電力系統",
    tiers: [
      { id: "economy", name: "經濟", cost: 8, mass: 6, value: 35 },
      { id: "standard", name: "標準", cost: 15, mass: 10, value: 65 },
      { id: "premium", name: "高階", cost: 25, mass: 15, value: 90 },
    ],
  },
  comm: {
    name: "通訊系統",
    tiers: [
      { id: "economy", name: "經濟", cost: 8, mass: 5, value: 35 },
      { id: "standard", name: "標準", cost: 15, mass: 8, value: 65 },
      { id: "premium", name: "高階", cost: 25, mass: 12, value: 90 },
    ],
  },
  science: {
    name: "科學酬載",
    tiers: [
      { id: "economy", name: "經濟", cost: 8, mass: 7, value: 30 },
      { id: "standard", name: "標準", cost: 16, mass: 11, value: 60 },
      { id: "premium", name: "高階", cost: 28, mass: 16, value: 90 },
    ],
  },
  propulsion: {
    name: "推進/姿態控制",
    tiers: [
      { id: "economy", name: "經濟", cost: 10, mass: 7, value: 35 },
      { id: "standard", name: "標準", cost: 18, mass: 11, value: 65 },
      { id: "premium", name: "高階", cost: 30, mass: 16, value: 90 },
    ],
  },
  structure: {
    name: "結構與屏蔽",
    tiers: [
      { id: "economy", name: "經濟", cost: 8, mass: 6, value: 35 },
      { id: "standard", name: "標準", cost: 14, mass: 10, value: 65 },
      { id: "premium", name: "高階", cost: 24, mass: 14, value: 90 },
    ],
  },
};

const SUBSYSTEM_KEYS = ["power", "comm", "science", "propulsion", "structure"];

const STAGES = [
  { id: "liftoff", name: "發射", baseThreshold: 50 },
  { id: "ascent", name: "穿越大氣層", baseThreshold: 30 },
  { id: "insertion", name: "軌道插入", baseThreshold: 30 },
  { id: "deployment", name: "展開部署", baseThreshold: 30 },
  { id: "operation", name: "任務運作", baseThreshold: 30 },
];

const EVENTS = [
  {
    id: "solar_flare",
    icon: "☀️",
    name: "太陽閃焰",
    desc: "強烈太陽閃焰即將抵達，可能干擾無線電通訊。",
    weight: 1,
    effect: { stage: "operation", stat: "comm", bonus: 25 },
  },
  {
    id: "geomagnetic_storm",
    icon: "🌩️",
    name: "地磁暴",
    desc: "地磁擾動可能影響衛星供電系統。",
    weight: 1,
    effect: { stage: "operation", stat: "power", bonus: 25 },
  },
  {
    id: "bad_weather",
    icon: "☁️",
    name: "惡劣天氣",
    desc: "發射場上空雲層密布，發射窗口風險升高。",
    weight: 1,
    effect: { stage: "liftoff", stat: "reliability", bonus: 20 },
  },
  {
    id: "wind_shear",
    icon: "💨",
    name: "高空風切",
    desc: "高空強風可能對箭體結構造成額外應力。",
    weight: 1,
    effect: { stage: "ascent", stat: "structure", bonus: 25 },
  },
  {
    id: "micrometeorite",
    icon: "🌠",
    name: "微隕石帶",
    desc: "任務軌道上偵測到微隕石帶，可能撞擊衛星結構。",
    weight: 1,
    effect: { stage: "operation", addCheck: "structure", threshold: 30 },
  },
  {
    id: "orbital_congestion",
    icon: "🛰️",
    name: "軌道壅塞",
    desc: "目標軌道上太空垃圾密集，入軌需要更精確的機動。",
    weight: 1,
    effect: { stage: "insertion", stat: "propulsion", bonus: 20 },
  },
  {
    id: "limited_ground_station",
    icon: "📡",
    name: "地面站覆蓋有限",
    desc: "可用地面站數量減少，通訊視窗變短。",
    weight: 1,
    effect: { stage: "operation", stat: "comm", bonus: 20 },
  },
  {
    id: "cold_snap",
    icon: "❄️",
    name: "極端低溫",
    desc: "異常低溫可能讓機構部件卡死，影響展開。",
    weight: 1,
    effect: { stage: "deployment", bonus: 20 },
  },
  {
    id: "budget_cut",
    icon: "💰",
    name: "預算臨時緊縮",
    desc: "任務預算在最後一刻被削減。",
    weight: 1,
    effect: { budgetDelta: -20 },
  },
  {
    id: "nominal",
    icon: "🌤️",
    name: "風平浪靜",
    desc: "目前沒有偵測到異常狀況，一切照計畫進行。",
    weight: 3,
    effect: {},
  },
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
