// 多語言字典（中／英）與翻譯輔助函式

const STRINGS = {
  zh: {
    app: { title: "太空精算師" },
    home: {
      subtitle: "設計你的太空任務",
      startGame: "開始遊戲",
      achievements: "成就展示",
      settings: "設定",
    },
    nav: { back: "返回" },
    event: {
      title: "任務簡報",
      startBtn: "開始選擇部件",
      budgetNoteNormal: "本局預算 {budget} C",
      budgetNoteAdjusted: "本局預算調整為 {budget} C",
      solar_flare: { name: "太陽閃焰", desc: "強烈太陽閃焰即將抵達，可能干擾無線電通訊。" },
      geomagnetic_storm: { name: "地磁暴", desc: "地磁擾動可能影響衛星供電系統。" },
      bad_weather: { name: "惡劣天氣", desc: "發射場上空雲層密布，發射窗口風險升高。" },
      wind_shear: { name: "高空風切", desc: "高空強風可能對箭體結構造成額外應力。" },
      micrometeorite: { name: "微隕石帶", desc: "任務軌道上偵測到微隕石帶，可能撞擊衛星結構。" },
      orbital_congestion: { name: "軌道壅塞", desc: "目標軌道上太空垃圾密集，入軌需要更精確的機動。" },
      limited_ground_station: { name: "地面站覆蓋有限", desc: "可用地面站數量減少，通訊視窗變短。" },
      cold_snap: { name: "極端低溫", desc: "異常低溫可能讓機構部件卡死，影響展開。" },
      budget_cut: { name: "預算臨時緊縮", desc: "任務預算在最後一刻被削減。" },
      nominal: { name: "風平浪靜", desc: "目前沒有偵測到異常狀況，一切照計畫進行。" },
    },
    rocket: { light: "輕型火箭", medium: "中型火箭", heavy: "重型火箭" },
    subsystem: {
      power: "電力系統",
      comm: "通訊系統",
      science: "科學酬載",
      propulsion: "推進/姿態控制",
      structure: "結構與屏蔽",
    },
    tier: { economy: "經濟", standard: "標準", premium: "高階" },
    stage: {
      liftoff: "發射",
      ascent: "穿越大氣層",
      insertion: "軌道插入",
      deployment: "展開部署",
      operation: "任務運作",
    },
    selection: {
      title: "選擇火箭與部件",
      budgetLabel: "預算",
      massLabel: "質量",
      rocketGroup: "火箭",
      launchBtn: "發射！",
      warningBudget: "超出預算，無法發射！",
      warningMass: "超出火箭酬載上限，無法發射！",
      warningBoth: "超出預算且超重，無法發射！",
      partStats: "Cost {cost} · Mass {mass} · 數值 {value}",
      rocketStats: "Cost {cost} · 酬載上限 {maxPayload} · 可靠度 {reliability}",
    },
    simulation: {
      title: "任務模擬中...",
      checking: "正在檢定：{stage} ...",
      passed: "{stage}：通過",
      failed: "{stage}：失敗！",
      zoneGround: "🌍 發射場",
      zoneAtmosphere: "☁️ 大氣層邊界",
      zoneOrbit: "🛰️ 任務軌道",
    },
    results: {
      successTitle: "任務成功！",
      successSubtitle: "衛星已成功進入軌道並開始運作。",
      failTitle: "任務失敗",
      failSubtitle: "任務在「{stage}」階段失敗。",
      achievementsHeader: "解鎖成就",
      noAchievement: "這次沒有解鎖成就，再試一次！",
      playAgain: "再玩一次",
      backHome: "回到主畫面",
    },
    radar: {
      mass: "質量效率",
      power: "電力",
      comm: "通訊",
      orbital: "軌道可靠度",
      science: "科學酬載",
      budget: "預算效率",
    },
    achievement: {
      first_orbit: "首次入軌成功",
      under_budget: "精打細算",
      storm_survivor: "力抗風暴",
      all_rounder: "全能設計",
      glorious_failure: "雖敗猶榮",
      never_give_up: "屢敗屢戰",
    },
    achievementsGallery: { title: "成就展示", locked: "尚未解鎖" },
    settings: {
      title: "設定",
      language: "語言",
      sound: "音效",
      volume: "音量",
      resetProgress: "重置進度與成就",
      resetConfirm: "確定要重置所有成就與失敗紀錄嗎？此動作無法復原。",
      resetDone: "已重置。",
    },
    tutorial: {
      next: "下一步",
      gotIt: "知道了",
      skip: "跳過教學",
      orbitName: "ORBIT",
      home: [
        "嗨！我是 ORBIT，接下來由我陪你完成第一次任務規劃。",
        "身為新上任的任務總監，你的工作是在預算內組出一艘能順利完成任務的衛星。",
        "準備好就按「開始遊戲」，我們去看看今天的任務狀況吧！",
      ],
      event: [
        "在動手選裝備之前，任務中心會先回報今天的太空環境狀況。",
        "這會影響你等一下該往哪個方向加強配置——看仔細囉。",
      ],
      selection: [
        "這裡要選火箭和 5 種衛星部件，每種都有經濟／標準／高階三檔可選。",
        "上面兩條量表分別是「預算」和「質量」，兩個都超過上限就無法發射，記得留意！",
        "選好全部部件後，按下方的「發射！」開始模擬任務。",
      ],
      simulation: [
        "接下來火箭會實際飛一次，共有 5 個關卡：發射、穿越大氣層、軌道插入、展開部署、任務運作。",
        "任何一關都可能失敗喔——祝你好運！",
      ],
      results: [
        "任務結束了！雷達圖會顯示你在 6 個面向的表現。",
        "達成特定條件還會解鎖成就，想看看解鎖了哪些可以到主畫面的「成就展示」查看。",
      ],
    },
  },

  en: {
    app: { title: "Space Actuary" },
    home: {
      subtitle: "Design Your Space Mission",
      startGame: "Start Game",
      achievements: "Achievements",
      settings: "Settings",
    },
    nav: { back: "Back" },
    event: {
      title: "Mission Briefing",
      startBtn: "Start Selecting Parts",
      budgetNoteNormal: "This mission's budget: {budget} C",
      budgetNoteAdjusted: "Budget adjusted to {budget} C this mission",
      solar_flare: { name: "Solar Flare", desc: "A strong solar flare is inbound and may disrupt radio communications." },
      geomagnetic_storm: { name: "Geomagnetic Storm", desc: "Geomagnetic disturbance may affect the satellite's power system." },
      bad_weather: { name: "Bad Weather", desc: "Heavy cloud cover over the launch site raises the launch window's risk." },
      wind_shear: { name: "High-Altitude Wind Shear", desc: "Strong high-altitude winds may put extra stress on the airframe." },
      micrometeorite: { name: "Micrometeorite Field", desc: "A micrometeorite field detected along the mission orbit may impact the satellite's structure." },
      orbital_congestion: { name: "Orbital Congestion", desc: "Dense space debris at the target orbit requires more precise insertion maneuvers." },
      limited_ground_station: { name: "Limited Ground Station Coverage", desc: "Fewer ground stations are available, shortening communication windows." },
      cold_snap: { name: "Extreme Cold Snap", desc: "Unusually low temperatures may jam deployment mechanisms." },
      budget_cut: { name: "Last-Minute Budget Cut", desc: "The mission budget was cut at the last minute." },
      nominal: { name: "Nominal Conditions", desc: "No anomalies detected — everything is proceeding as planned." },
    },
    rocket: { light: "Light Rocket", medium: "Medium Rocket", heavy: "Heavy Rocket" },
    subsystem: {
      power: "Power System",
      comm: "Communications",
      science: "Science Payload",
      propulsion: "Propulsion / ACS",
      structure: "Structure & Shielding",
    },
    tier: { economy: "Economy", standard: "Standard", premium: "Premium" },
    stage: {
      liftoff: "Liftoff",
      ascent: "Atmospheric Ascent",
      insertion: "Orbit Insertion",
      deployment: "Deployment",
      operation: "Operation",
    },
    selection: {
      title: "Choose Your Rocket & Parts",
      budgetLabel: "Budget",
      massLabel: "Mass",
      rocketGroup: "Rocket",
      launchBtn: "Launch!",
      warningBudget: "Over budget — cannot launch!",
      warningMass: "Over the rocket's payload limit — cannot launch!",
      warningBoth: "Over budget and overweight — cannot launch!",
      partStats: "Cost {cost} · Mass {mass} · Value {value}",
      rocketStats: "Cost {cost} · Payload cap {maxPayload} · Reliability {reliability}",
    },
    simulation: {
      title: "Simulating Mission...",
      checking: "Checking: {stage} ...",
      passed: "{stage}: Passed",
      failed: "{stage}: Failed!",
      zoneGround: "🌍 Launch Site",
      zoneAtmosphere: "☁️ Atmosphere Boundary",
      zoneOrbit: "🛰️ Mission Orbit",
    },
    results: {
      successTitle: "Mission Success!",
      successSubtitle: "The satellite reached orbit and is now operational.",
      failTitle: "Mission Failed",
      failSubtitle: "The mission failed during the {stage} stage.",
      achievementsHeader: "Achievements Unlocked",
      noAchievement: "No achievements this time — try again!",
      playAgain: "Play Again",
      backHome: "Back to Home",
    },
    radar: {
      mass: "Mass Efficiency",
      power: "Power",
      comm: "Communications",
      orbital: "Orbital Reliability",
      science: "Science Payload",
      budget: "Budget Efficiency",
    },
    achievement: {
      first_orbit: "First Orbit Achieved",
      under_budget: "Frugal Engineer",
      storm_survivor: "Storm Survivor",
      all_rounder: "All-Rounder",
      glorious_failure: "Glorious Failure",
      never_give_up: "Never Give Up",
    },
    achievementsGallery: { title: "Achievements", locked: "Locked" },
    settings: {
      title: "Settings",
      language: "Language",
      sound: "Sound Effects",
      volume: "Volume",
      resetProgress: "Reset Progress & Achievements",
      resetConfirm: "Reset all achievements and fail history? This cannot be undone.",
      resetDone: "Progress reset.",
    },
    tutorial: {
      next: "Next",
      gotIt: "Got it",
      skip: "Skip Tutorial",
      orbitName: "ORBIT",
      home: [
        "Hi, I'm ORBIT — I'll walk you through your first mission.",
        "As the new Mission Director, your job is to build a satellite that can get the job done within budget.",
        'Hit "Start Game" when you\'re ready, and let\'s check today\'s mission conditions.',
      ],
      event: [
        "Before you pick any hardware, mission control reports today's space environment conditions.",
        "This affects what you should prioritize in your build — read it carefully.",
      ],
      selection: [
        "Pick a rocket and 5 satellite subsystems, each with Economy / Standard / Premium tiers.",
        "The two bars up top are your Budget and Mass limits — go over either one and you can't launch.",
        'Once everything\'s picked, hit "Launch!" below to run the simulation.',
      ],
      simulation: [
        "Now the rocket actually flies through 5 checkpoints: Liftoff, Ascent, Orbit Insertion, Deployment, and Operation.",
        "Any of them can fail — good luck!",
      ],
      results: [
        "Mission complete! The radar chart shows how you did across 6 dimensions.",
        'Meeting certain conditions unlocks achievements — check the "Achievements" gallery from the home screen to see what you\'ve got.',
      ],
    },
  },
};

function getLang() {
  return storageGetSettings().lang || "zh";
}

function lookup(dict, key) {
  return key.split(".").reduce((obj, part) => (obj ? obj[part] : undefined), dict);
}

function t(key, params) {
  let str = lookup(STRINGS[getLang()], key);
  if (str === undefined) str = lookup(STRINGS.zh, key);
  if (str === undefined) return key;
  if (params) {
    Object.keys(params).forEach((k) => {
      str = str.replace(`{${k}}`, params[k]);
    });
  }
  return str;
}

function tt(key) {
  const arr = lookup(STRINGS[getLang()], key);
  return Array.isArray(arr) ? arr : [];
}

function applyStaticTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
}
