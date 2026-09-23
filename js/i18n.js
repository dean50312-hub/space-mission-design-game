// 多語言字典（中／英）與翻譯輔助函式

const STRINGS = {
  zh: {
    app: { title: "太空精算師" },
    home: {
      subtitle: "設計你的太空任務",
      startGame: "自由遊玩",
      startGameLocked: "自由遊玩（通關劇情關卡後解鎖）",
      campaignProgress: "劇情關卡（{level}/{total}）",
      campaignReplay: "重新挑戰劇情關卡",
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
    orbit: { leo: "低軌 LEO", geo: "同步軌道 GEO" },
    objective: {
      science: { icon: "🔬", short: "科學實驗", name: "任務目標：科學實驗", desc: "團隊需要在近地環境進行微重力科學實驗。" },
      remote_sensing: { icon: "🛰️", short: "遙測", name: "任務目標：遙測", desc: "任務需要近距離、高頻率地掃描地球表面。" },
      comms: { icon: "📡", short: "通訊", name: "任務目標：通訊", desc: "任務需要衛星持續覆蓋同一個地面區域，提供不間斷的通訊服務。" },
      weather: { icon: "🌦️", short: "氣象觀測", name: "任務目標：氣象觀測", desc: "任務需要持續監測同一區域的氣象變化。" },
    },
    fuel: {
      hydrazine: "聯胺 Hydrazine",
      af_m315e: "AF-M315E",
      hydrogen_peroxide: "雙氧水 H₂O₂",
      ion: "離子推進 Ion",
      hall: "霍爾推進 Hall",
    },
    subsystem: {
      power: "電力系統",
      comm: "通訊系統",
      science: "科學酬載",
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
      fuelGroup: "燃料",
      fuelStats: "{type} · 比衝 {isp}s",
      fuelTypeChemical: "化學",
      fuelTypeElectric: "電推",
      fuelPercentLabel: "填充量",
      fuelSummary: "質量 {mass} MU · 成本 {cost} C · 推進貢獻 {propulsion}",
      hazmatCheckbox: "加購毒氣危害處理（+{cost} C）",
      hazmatWarning: "不加購的話，有 {chance}% 機率發生工安事故，產生額外 {penalty} C 清理成本（計入預算效率分數）。",
      orbitGroup: "軌道",
      orbitStats: "預算 {budget} C",
      orbitLiftoffNote: "⚠️ 發射門檻 +{bonus}（需要更可靠的火箭）",
    },
    simulation: {
      title: "任務模擬中...",
      checking: "正在檢定：{stage} ...",
      passed: "{stage}：通過",
      failed: "{stage}：失敗！",
      fueling: "加註燃料中...",
      fuelingOk: "燃料加註作業順利完成",
      fuelingIncident: "⚠️ 加註燃料時發生洩漏意外，產生額外清理成本",
      zoneGround: "🌍 發射場",
      zoneAtmosphere: "☁️ 大氣層邊界",
      zoneOrbit: "🛰️ 任務軌道",
    },
    results: {
      successTitle: "任務成功！",
      successSubtitle: "衛星已成功進入軌道並開始運作。",
      failTitle: "任務失敗",
      failSubtitle: "任務在「{stage}」階段失敗。",
      reasonShortfall: "{stat}不足（數值 {value}，需要 {threshold} 以上）",
      reasonBadLuck: "{stat}數值原本充足，卻發生了非預期的技術故障",
      reasonOrbitMismatch: "衛星軌道與任務目標不匹配：{objective}需要{correctOrbit}，但選擇了{chosenOrbit}，導致任務無法達成",
      achievementsHeader: "解鎖成就",
      noAchievement: "這次沒有解鎖成就，再試一次！",
      playAgain: "再玩一次",
      backHome: "回到主畫面",
      campaignLevelComplete: "🎉 劇情關卡 {level} 過關！獲得 {points} 技能點數",
      campaignAllComplete: "🎉 恭喜完成全部劇情關卡！獲得 {points} 技能點數，自由遊玩模式已解鎖！",
    },
    radar: {
      mass: "質量效率",
      power: "電力",
      comm: "通訊",
      orbital: "軌道可靠度",
      science: "科學酬載",
      budget: "預算效率",
    },
    stat: {
      reliability: "火箭可靠度",
      structure: "結構強度",
      propulsion: "推進精度",
      power: "電力",
      comm: "通訊",
      deployment: "部署機構",
    },
    achievement: {
      first_orbit: {
        name: "首次入軌成功",
        hint: "成功完成一次任務",
        story: "1969 年 7 月 20 日，阿波羅 11 號的尼爾・阿姆斯壯成為第一位踏上月球的人類，他說出了那句名言：「這是我個人的一小步，卻是全人類的一大步。」",
      },
      under_budget: {
        name: "精打細算",
        hint: "任務成功且花費低於預算的 60%",
        story: "2013 年，印度的「曼加里安號」火星軌道探測器以僅約 7,400 萬美元的成本成功入軌，是史上最便宜的星際任務之一，還讓印度成為第一個首次嘗試就成功抵達火星的國家。",
      },
      storm_survivor: {
        name: "力抗風暴",
        hint: "在太陽閃焰或地磁暴事件中任務成功",
        story: "1972 年 8 月，一場強烈的太陽風暴恰好發生在阿波羅 16 號與 17 號任務之間。如果當時有太空人正在月球表面，這場風暴的輻射劑量可能會對他們造成嚴重傷害——他們只是運氣好，躲過了這一劫。",
      },
      all_rounder: {
        name: "全能設計",
        hint: "雷達圖六項數值都達到 80 以上且任務成功",
        story: "1977 年發射的航海家一號與二號，原本只是設計來探索木星和土星的任務，工程餘裕卻好到讓航海家二號一路飛越天王星、海王星，兩艘探測器至今仍在星際空間持續傳回資料，是工程「面面俱到」的最佳典範。",
      },
      glorious_failure: {
        name: "雖敗猶榮",
        hint: "在發射或穿越大氣層階段失敗",
        story: "1967 年 4 月 24 日，蘇聯太空人弗拉基米爾・科馬洛夫在聯合號一號任務返航時，因降落傘故障不幸罹難，成為第一位在太空任務中犧牲的太空人。他的犧牲讓後續的太空計畫更加重視安全冗餘設計。",
      },
      never_give_up: {
        name: "屢敗屢戰",
        hint: "累積失敗 5 次後任務成功",
        story: "SpaceX 的獵鷹一號火箭曾連續三次發射失敗，公司一度瀕臨破產。直到 2008 年 9 月第四次發射終於成功，不但拯救了公司，也開啟了 SpaceX 後來的傳奇。",
      },
      bare_bones: {
        name: "克難精神",
        hint: "火箭選輕型、5 個部件都選經濟檔，且任務成功",
        story: "1957 年 10 月 4 日，蘇聯發射的史普尼克一號只是一顆直徑 58 公分、裝了四根天線的簡單金屬球，沒有任何科學儀器，卻靠著這樣的陽春設計成為人類第一顆人造衛星，正式揭開太空時代的序幕。",
      },
      top_of_the_line: {
        name: "不計成本",
        hint: "5 個部件都選高階檔，且任務成功",
        story: "詹姆斯・韋伯太空望遠鏡耗資超過 100 億美元，是有史以來最昂貴的太空科學任務，但也換來了能看穿宇宙塵埃、直窺早期宇宙誕生的頂級觀測能力，證明有些時候貴是真的有貴的道理。",
      },
      so_close: {
        name: "功虧一簣",
        hint: "在軌道插入、展開部署或任務運作階段失敗",
        story: "1999 年，NASA 的火星氣候探測者號在即將進入火星軌道時失聯——事後調查發現，是因為地面團隊一邊用公制、一邊用英制單位計算推力，導致探測器以錯誤的高度衝入大氣層解體。只差臨門一腳的教訓，讓「單位換算」從此成為工程界的經典警世故事。",
      },
      crisis_management: {
        name: "危機處理",
        hint: "在「預算臨時緊縮」事件中任務成功",
        story: "1970 年，阿波羅 13 號在飛往月球途中氧氣槽爆炸，任務被迫放棄登月。但地面團隊與太空人在資源嚴重受限的情況下臨機應變，成功讓三名太空人安全返回地球，被譽為「成功的失敗」，也是太空史上最經典的危機處理案例。",
      },
      flawless_mission: {
        name: "完美無瑕",
        hint: "雷達圖六項數值都達到 95 以上且任務成功",
        story: "2021 年，NASA 的毅力號火星車要在短短 7 分鐘內獨立完成降落傘展開、反推噴射、「空中吊車」垂降等一連串高難度動作，中間任何一個環節出錯都會導致任務失敗——史稱「恐怖七分鐘」。最終每個步驟都完美執行，堪稱工程精算的極致展現。",
      },
      space_polymath: {
        name: "太空全才",
        hint: "解鎖其他所有成就",
        story: "從史普尼克一號到航海家號、從阿波羅計畫到現代的火星探測，太空探索的每個里程碑背後都是無數次的精算、取捨與偶爾的運氣。你已經體驗過這些故事的縮影——真正的太空任務，往往就是這樣一步步走出來的。",
      },
    },
    achievementsGallery: { title: "成就展示", locked: "尚未解鎖", storyLabel: "📖 太空史小知識" },
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
        "嗨！我是 ORBIT，你的訓練官。歡迎上任，新任指揮官。",
        "在你獨當一面之前，我們會先跑幾次模擬訓練，一步一步認識任務設計的每個環節。",
        "準備好就按「劇情關卡」，我們開始第一次模擬吧！",
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
      startGame: "Free Play",
      startGameLocked: "Free Play (unlocks after completing the campaign)",
      campaignProgress: "Campaign ({level}/{total})",
      campaignReplay: "Replay Campaign",
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
    orbit: { leo: "Low Earth Orbit (LEO)", geo: "Geostationary Orbit (GEO)" },
    objective: {
      science: { icon: "🔬", short: "Science Experiment", name: "Objective: Science Experiment", desc: "The team needs to run microgravity science experiments in a near-Earth environment." },
      remote_sensing: { icon: "🛰️", short: "Remote Sensing", name: "Objective: Remote Sensing", desc: "The mission needs to scan Earth's surface up close and frequently." },
      comms: { icon: "📡", short: "Communications", name: "Objective: Communications", desc: "The mission needs the satellite to continuously cover the same ground area with uninterrupted service." },
      weather: { icon: "🌦️", short: "Weather Observation", name: "Objective: Weather Observation", desc: "The mission needs to continuously monitor weather changes over the same region." },
    },
    fuel: {
      hydrazine: "Hydrazine",
      af_m315e: "AF-M315E",
      hydrogen_peroxide: "Hydrogen Peroxide",
      ion: "Ion Thruster",
      hall: "Hall Thruster",
    },
    subsystem: {
      power: "Power System",
      comm: "Communications",
      science: "Science Payload",
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
      fuelGroup: "Fuel",
      fuelStats: "{type} · Isp {isp}s",
      fuelTypeChemical: "Chemical",
      fuelTypeElectric: "Electric",
      fuelPercentLabel: "Fill Amount",
      fuelSummary: "Mass {mass} MU · Cost {cost} C · Propulsion {propulsion}",
      hazmatCheckbox: "Add Toxic Hazard Handling (+{cost} C)",
      hazmatWarning: "Skip it and there's a {chance}% chance of a workplace safety incident, adding {penalty} C in cleanup costs (counted against your Budget Efficiency score).",
      orbitGroup: "Orbit",
      orbitStats: "Budget {budget} C",
      orbitLiftoffNote: "⚠️ Liftoff threshold +{bonus} (needs a more reliable rocket)",
    },
    simulation: {
      title: "Simulating Mission...",
      checking: "Checking: {stage} ...",
      passed: "{stage}: Passed",
      failed: "{stage}: Failed!",
      fueling: "Fueling...",
      fuelingOk: "Fueling completed safely",
      fuelingIncident: "⚠️ A leak occurred during fueling, incurring extra cleanup costs",
      zoneGround: "🌍 Launch Site",
      zoneAtmosphere: "☁️ Atmosphere Boundary",
      zoneOrbit: "🛰️ Mission Orbit",
    },
    results: {
      successTitle: "Mission Success!",
      successSubtitle: "The satellite reached orbit and is now operational.",
      failTitle: "Mission Failed",
      failSubtitle: "The mission failed during the {stage} stage.",
      reasonShortfall: "{stat} fell short (value {value}, needed {threshold}+)",
      reasonBadLuck: "{stat} was within spec, but an unexpected malfunction occurred anyway",
      reasonOrbitMismatch: "Orbit doesn't match the mission objective: {objective} needs {correctOrbit}, but you chose {chosenOrbit} — the mission could not be accomplished",
      achievementsHeader: "Achievements Unlocked",
      noAchievement: "No achievements this time — try again!",
      playAgain: "Play Again",
      backHome: "Back to Home",
      campaignLevelComplete: "🎉 Campaign Level {level} complete! Earned {points} skill points",
      campaignAllComplete: "🎉 Congratulations, you've completed the whole campaign! Earned {points} skill points, and Free Play is now unlocked!",
    },
    radar: {
      mass: "Mass Efficiency",
      power: "Power",
      comm: "Communications",
      orbital: "Orbital Reliability",
      science: "Science Payload",
      budget: "Budget Efficiency",
    },
    stat: {
      reliability: "Rocket Reliability",
      structure: "Structural Integrity",
      propulsion: "Propulsion Precision",
      power: "Power",
      comm: "Communications",
      deployment: "Deployment Mechanism",
    },
    achievement: {
      first_orbit: {
        name: "First Orbit Achieved",
        hint: "Complete a mission successfully",
        story: 'On July 20, 1969, Apollo 11\'s Neil Armstrong became the first human to set foot on the Moon, famously saying: "That\'s one small step for man, one giant leap for mankind."',
      },
      under_budget: {
        name: "Frugal Engineer",
        hint: "Succeed while spending under 60% of your budget",
        story: "In 2013, India's Mars Orbiter Mission (Mangalyaan) reached Mars orbit for about $74 million — one of the cheapest interplanetary missions ever — making India the first nation to succeed at Mars on its very first attempt.",
      },
      storm_survivor: {
        name: "Storm Survivor",
        hint: "Succeed during a Solar Flare or Geomagnetic Storm event",
        story: "In August 1972, a massive solar storm struck right between the Apollo 16 and Apollo 17 missions. Had astronauts been on the lunar surface at the time, the radiation could have posed a serious danger — they simply got lucky with the timing.",
      },
      all_rounder: {
        name: "All-Rounder",
        hint: "Succeed with all six radar stats at 80+",
        story: "Launched in 1977, Voyager 1 and 2 were originally designed to explore Jupiter and Saturn, but thanks to remarkable engineering margins, Voyager 2 went on to fly past Uranus and Neptune as well — and both probes are still transmitting from interstellar space today.",
      },
      glorious_failure: {
        name: "Glorious Failure",
        hint: "Fail during Liftoff or Atmospheric Ascent",
        story: "On April 24, 1967, Soviet cosmonaut Vladimir Komarov died when Soyuz 1's parachute failed during reentry, becoming the first person to die during an actual spaceflight. His loss pushed later space programs to take safety margins far more seriously.",
      },
      never_give_up: {
        name: "Never Give Up",
        hint: "Succeed after accumulating 5 failures",
        story: "SpaceX's Falcon 1 rocket failed three launches in a row, nearly bankrupting the company. Its fourth attempt in September 2008 finally succeeded — saving SpaceX and kicking off its legendary run.",
      },
      bare_bones: {
        name: "Bare Bones",
        hint: "Succeed using the Light rocket with all-Economy parts",
        story: "On October 4, 1957, the Soviet Union's Sputnik 1 — a simple 58 cm metal sphere with four antennas and no scientific instruments at all — became humanity's first artificial satellite, kicking off the Space Age with the bare minimum.",
      },
      top_of_the_line: {
        name: "Top of the Line",
        hint: "Succeed with all-Premium parts",
        story: "The James Webb Space Telescope cost over $10 billion, making it the most expensive science mission ever flown — but it bought unmatched observing power that lets us peer through cosmic dust to see the universe's earliest galaxies. Sometimes you really do get what you pay for.",
      },
      so_close: {
        name: "So Close",
        hint: "Fail during Orbit Insertion, Deployment, or Operation",
        story: "In 1999, NASA's Mars Climate Orbiter went silent right as it approached Mars orbit insertion. The investigation found the cause: one team used metric units, another used imperial — the mismatch sent the probe in at the wrong altitude, and it broke apart in the atmosphere. A lesson learned one step from success, and now a classic cautionary tale in engineering.",
      },
      crisis_management: {
        name: "Crisis Management",
        hint: "Succeed during a Last-Minute Budget Cut event",
        story: 'In 1970, an oxygen tank explosion forced Apollo 13 to abandon its Moon landing mid-flight. With severely limited resources, mission control and the crew improvised their way through the crisis and brought all three astronauts home safely — remembered as a "successful failure" and one of the greatest crisis-management stories in spaceflight history.',
      },
      flawless_mission: {
        name: "Flawless Mission",
        hint: "Succeed with all six radar stats at 95+",
        story: 'In 2021, NASA\'s Perseverance rover had to autonomously execute a parachute deployment, retro-rocket burn, and "sky crane" descent — all within seven minutes, with zero margin for error. Nicknamed the "seven minutes of terror," every single step went exactly as planned — a masterclass in engineering precision.',
      },
      space_polymath: {
        name: "Space Polymath",
        hint: "Unlock every other achievement",
        story: "From Sputnik to Voyager, from Apollo to modern Mars rovers, every milestone in space exploration was built on countless calculations, trade-offs, and the occasional stroke of luck. You've now lived a taste of all of it — real space missions are built exactly this way, one hard decision at a time.",
      },
    },
    achievementsGallery: { title: "Achievements", locked: "Locked", storyLabel: "📖 Space History" },
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
        "Hi, I'm ORBIT, your training officer. Welcome aboard, Commander.",
        "Before you fly solo, we'll run a few training simulations to walk through mission design step by step.",
        'Hit "Campaign" when you\'re ready, and let\'s start your first simulation!',
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
