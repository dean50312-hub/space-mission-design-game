# 參考資料

這份文件記錄專案裡引用到的外部資料來源，主要是「成就展示」頁面裡每個成就搭配的太空史小知識。每條都已重新查證，附上官方或可靠來源連結，方便繳交時附上引用，也方便之後複查事實正確性。

## 挑戰本身

- [NASA Space Apps Challenge 2026 — Space Mission Design Game](https://www.spaceappschallenge.org/2026/challenges/space-mission-design-game/) — 官方挑戰頁面，本專案的需求與難度定位依據

## 燃料系統的比衝（Isp）數據

用於計算燃料質量係數，數字已查證：

- 聯胺（220s）：[A Survey of Hydrazine Monopropellant Thrusters](https://arc.aiaa.org/doi/10.2514/6.2026-3090) — 一般型號穩態比衝約 215–235s
- AF-M315E（245s）：[Green Propellant Infusion Mission (GPIM) Overview — NASA](https://www.nasa.gov/missions/tech-demonstration/green-propellant-infusion-mission-gpim-overview/) — 比聯胺高約 12%
- 雙氧水（160s）：[Development of Hydrogen Peroxide Monopropellant Rockets — ESA](https://www.esa.int/gsp/ACT/doc/PRO/ACT-RPR-PRO-JPC2006-HP%20Rockets%202006-5239.pdf) — 實測值約 150–170s
- 離子推進 NSTAR（3000s）：[NSTAR — Astronautix](http://www.astronautix.com/n/nstar.html)；[Deep Space 1 — Wikipedia](https://en.wikipedia.org/wiki/Deep_Space_1) — 依功率在 1900–3100s 之間，取高功率端數值
- 霍爾推進 SPT-100（1600s）：[Hall-effect thruster — Wikipedia](https://en.wikipedia.org/wiki/Hall-effect_thruster) — 此類型比衝約 1600s

## 火箭三檔的原型數據

- 輕型／Rocket Lab Electron：[Rocket Lab Electron — Wikipedia](https://en.wikipedia.org/wiki/Rocket_Lab_Electron) — 高 18m，酬載 300kg 至低軌
- 中型／SpaceX Falcon 9：[Falcon 9 — Wikipedia](https://en.wikipedia.org/wiki/Falcon_9) — 高 69.8m，酬載 22,800kg 至低軌（一級不回收）
- 重型／SpaceX Falcon Heavy：[Falcon Heavy — Wikipedia](https://en.wikipedia.org/wiki/Falcon_Heavy) — 高 70m，3 具獵鷹 9 號一級並聯，酬載 63,800kg 至低軌

## 4 個子系統的原型數據

- 電力-經濟／Vanguard 1：[Vanguard 1 — Wikipedia](https://en.wikipedia.org/wiki/Vanguard_1)；[NSSDCA — NASA](https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1958-002B) — 1958 年發射，6 片太陽能電池共約 1 瓦，現存最古老人造衛星
- 電力-高階／RTG：一般性技術描述，航海家號、好奇號、毅力號皆採用（見成就故事的 Voyager 引用）
- 通訊-經濟／Telstar 1：一般公認為人類第一顆主動式通訊衛星（1962），完成首次跨大西洋電視訊號中繼
- 通訊-高階／TDRS：[Tracking and Data Relay Satellite System — Wikipedia](https://en.wikipedia.org/wiki/Tracking_and_Data_Relay_Satellite_System)；[NASA TDRS](https://www.nasa.gov/mission/tracking-and-data-relay-satellites/) — 單向最高約 800 Mbps（Ku/Ka 頻段），服務哈伯太空望遠鏡等 25+ 任務
- 科學-經濟／Explorer 1 蓋革計數器：[A Short History of Earth's Radiation Belts — NASA](https://www.nasa.gov/history/a-short-history-of-earths-radiation-belts/) — 1958 年發現范艾倫輻射帶
- 科學-高階／JWST NIRCam：JWST 官方任務資料（見成就故事的 James Webb Space Telescope 引用）
- 結構-標準／Whipple Shield：[Whipple shield — Wikipedia](https://en.wikipedia.org/wiki/Whipple_shield) — 犧牲層分散微隕石衝擊能量，ISS 關鍵艙段採用
- 結構-高階／JWST 遮陽罩：[The Sunshield — NASA/Webb](https://jwst.nasa.gov/content/observatory/sunshield.html) — 5 層 Kapton 薄膜，展開約 21.2m × 14.2m（網球場大小）

> 成本係數（不同於質量係數）是遊戲平衡數字，反映各技術的相對複雜度／成熟度，非物理量，不對應特定引用。

## 成就對應的太空史料

### 🏆 首次入軌成功 — 阿波羅 11 號
- [Apollo 11 Mission Overview — NASA](https://www.nasa.gov/history/apollo-11-mission-overview/)
- [Apollo 11 — NASA](https://www.nasa.gov/mission/apollo-11/)
- [July 20, 1969: One Giant Leap For Mankind — NASA](https://www.nasa.gov/history/july-20-1969-one-giant-leap-for-mankind/)

### 💰 精打細算 — 曼加里安號（印度火星軌道探測器）
- [India's $74 million Mars mission cost less than 'Gravity' movie — CNN](https://www.cnn.com/2014/09/25/news/india-mars-cost)
- [Mars Orbiter Mission — Wikipedia](https://en.wikipedia.org/wiki/Mars_Orbiter_Mission)

> 非 NASA 資源——這是印度太空研究組織（ISRO）的任務，故事重點是「用極低成本首次嘗試就成功」。

### 🛡️ 力抗風暴 — 1972 年 8 月太陽風暴
- [NASA Space Weather Living History — 1972](https://spaceweatherlivinghistory.org/timeline/31/)
- [How NASA Will Protect Astronauts From Space Radiation — NASA Goddard](https://svs.gsfc.nasa.gov/13275)

> 這場風暴發生在阿波羅 16 號（1972 年 4 月返航）與阿波羅 17 號（1972 年 12 月發射）之間，若時程稍有變動，當時在月表的太空人可能會受到足以致命的輻射劑量。

### ⭐ 全能設計 — 航海家一號、二號
- [Voyager — NASA JPL Mission Overview](https://voyager.jpl.nasa.gov/mission/)
- [Voyager 1: The Farthest Spacecraft — NASA Science](https://science.nasa.gov/mission/voyager/voyager-1/)
- [Interstellar Mission — NASA Science](https://science.nasa.gov/mission/voyager/interstellar-mission/)

> 航海家二號是唯一飛越天王星與海王星的探測器；航海家一號只飛到土星後轉向星際空間。故事文字已依此修正，避免誤植成兩艘都飛越了天王海王星。

### 💥 雖敗猶榮 — 弗拉基米爾・科馬洛夫與聯合號一號
- [Vladimir Komarov — Wikipedia](https://en.wikipedia.org/wiki/Vladimir_Komarov)
- [The First Fatal Spaceflight — Smithsonian Magazine](https://www.smithsonianmag.com/air-space-magazine/first-fatal-spaceflight-180963019/)

> 非 NASA 資源（蘇聯任務）。1967 年 4 月 23 日發射，4 月 24 日返航時因降落傘故障罹難，是第一位在實際太空飛行任務中犧牲的太空人。遊戲內文字刻意採取較嚴肅、致敬的語氣。

### 🔁 屢敗屢戰 — SpaceX 獵鷹一號
- [Falcon 1 — Wikipedia](https://en.wikipedia.org/wiki/Falcon_1)
- [SpaceX Successfully Launches Falcon 1 Rocket Into Orbit — Space.com](https://www.space.com/5905-spacex-successfully-launches-falcon-1-rocket-orbit.html)

> 非 NASA 資源（民營公司）。前三次發射（2006、2007、2008 年多次）皆失敗，2008 年 9 月第四次終於成功入軌，是 SpaceX 差點破產前的關鍵一役。

### 🛠️ 克難精神 — 史普尼克一號
- [Dawn of the Space Age — NASA](https://www.nasa.gov/history/dawn-of-the-space-age/)
- [Sputnik and the Origins of the Space Age — NASA History Office](https://www.nasa.gov/history/sputnik/sputorig.html)

> 非 NASA 任務（蘇聯），但引用的是 NASA 歷史辦公室（NASA History Office）的回顧資料。

### 💎 不計成本 — 詹姆斯・韋伯太空望遠鏡
- [How much did NASA's James Webb Space Telescope cost? — USAFacts](https://usafacts.org/articles/how-much-did-nasas-james-webb-space-telescope-cost/)
- [How much does the James Webb Space Telescope cost? — The Planetary Society](https://www.planetary.org/articles/cost-of-the-jwst)

> NASA 官方數字約為 97 億美元（含開發與初期運作），媒體常概略稱為「百億美元望遠鏡」，遊戲文字採用後者的通俗說法。

### 💔 功虧一簣 — 火星氣候探測者號
- [Mars Climate Orbiter — NASA JPL](https://www.jpl.nasa.gov/missions/mars-climate-orbiter/)
- [Mars Climate Orbiter Mishap — NASA Safety Center](https://sma.nasa.gov/news/safety-messages/safety-message-item/lost-in-translation)

> 1999 年因地面團隊一方用公制、一方用英制單位計算推力數據，探測器以錯誤高度進入火星大氣層解體，是工程界最經典的「單位換算」警世案例。

### 🧯 危機處理 — 阿波羅 13 號
- [NASA Commemorates 50th Anniversary of Apollo 13, 'A Successful Failure' — NASA](https://www.nasa.gov/news-release/nasa-commemorates-50th-anniversary-of-apollo-13-a-successful-failure/)

### 🎯 完美無瑕 — 毅力號「恐怖七分鐘」
- [7 Minutes to Mars: NASA's Perseverance Rover Attempts Most Dangerous Landing Yet — NASA JPL](https://www.jpl.nasa.gov/videos/7-minutes-to-mars-nasas-perseverance-rover-attempts-most-dangerous-landing-yet/)
- [Perseverance Team Overcomes Seven Minutes of Terror — NASA APPEL](https://appel.nasa.gov/2021/02/23/perseverance-team-overcomes-seven-minutes-of-terror/)

### 👑 太空全才
無對應單一真實事件，是遊戲原創的隱藏總成就（集滿其餘 11 個成就解鎖），文字為統整性的致敬語，不引用特定資料來源。

## 使用限制提醒

上面的第三方新聞／百科來源（CNN、Smithsonian、Space.com、Wikipedia 等）僅供你我核對事實使用；正式繳交文件如果要附引用，建議優先引用其中的 **NASA/JPL/ISRO 官方頁面**，第三方來源作為輔助佐證即可。
