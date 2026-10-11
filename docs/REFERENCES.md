# 參考資料

這份文件記錄專案裡引用到的外部資料來源，主要是「成就展示」頁面裡每個成就搭配的太空史小知識。每條都已重新查證，附上官方或可靠來源連結，方便繳交時附上引用，也方便之後複查事實正確性。

## 挑戰本身

- [NASA Space Apps Challenge 2026 — Space Mission Design Game](https://www.spaceappschallenge.org/2026/challenges/space-mission-design-game/) — 官方挑戰頁面，本專案的需求與難度定位依據

## 任務模型 v2 的真實數據（2026-09-30 查證）

遊戲的每個機制都對應真實的太空工程原理。下列數字直接寫在 `js/data.js`，括號內是遊戲裡的用法。

### 火箭：價格、運力、飛行紀錄

- Falcon 9：[Falcon 9 — Wikipedia](https://en.wikipedia.org/wiki/Falcon_9) — 回收構型 LEO 17,500 kg、GTO 5,500 kg；2026 年商業發射價約 $74M；690 次發射、687 次成功（CRS-7 與 Starlink Group 9-3 兩次失敗、CRS-1 一次部分失敗）
- Falcon Heavy：[Falcon Heavy — Wikipedia](https://en.wikipedia.org/wiki/Falcon_Heavy) — 三節全回收時 GTO 8 t、側助推器回收時 LEO 約 57 t；回收構型報價 $97M；13 次發射全部成功
- Electron：[Rocket Lab Electron — Wikipedia](https://en.wikipedia.org/wiki/Rocket_Lab_Electron) — SSO 200 kg（遊戲的 LEO 任務都是地球觀測，採用 SSO 運力）、每次約 $7.5M；97 次發射（含 9 次亞軌道 HASTE），4 次失敗。遊戲只計入軌道發射：88 次、84 次成功
- 2025 年紀錄佐證：[Rocket Lab ends 2025 with 21 launches — Barchart](https://www.barchart.com/story/news/36733390/rocket-lab-successfully-launches-for-iqps-ends-2025-with-21-launches-and-100-mission-success)
- 可靠度估計：拉普拉斯接續法則（(成功+1)/(總次數+2)），統計學標準方法，用來說明「樣本少的火箭不能當成 100% 可靠」

> Falcon 9／Falcon Heavy 的 SSO 運力略低於 LEO，但仍遠超過遊戲中任何衛星的質量，所以直接使用 LEO 數字。

### 軌道力學

- GTO→GEO 圓化 1,831 m/s（卡納維爾角 28.5°）：[MIT 16.512 Rocket Propulsion, Lecture 34](https://ocw.mit.edu/courses/16-512-rocket-propulsion-fall-2005/768501e0e6a9ea6ef794c2866ea1bd63_lecture_34.pdf)
- GEO 南北位置保持約 50 m/s/年、東西約 2–5 m/s/年：[Orbital station-keeping — Wikipedia](https://en.wikipedia.org/wiki/Orbital_station-keeping)（遊戲用 15 年 × 50 m/s = 0.75 km/s）
- 全電推衛星轉移到 GEO 約需 6 個月：[Eutelsat 115 West B — Wikipedia](https://en.wikipedia.org/wiki/Eutelsat_115_West_B)（Boeing 702SP，2015 年與 ABS-3A 疊在同一枚 Falcon 9 發射）
- 低推力螺旋轉移的 Δv 高於脈衝式轉移：多篇文獻指出（例：[Optimised GTO-GEO transfer using low-thrust propulsion — Strathclyde](https://pureportal.strath.ac.uk/en/publications/optimised-gto-geo-transfer-using-low-thrust-propulsion/)）。**遊戲取 1.3 倍作估算**，實際數值依軌跡最佳化而異
- LEO 500 km：週期約 95 分鐘、蝕約 35 分鐘；太陽能板平均可用功率約為額定的 62%（340.5 W → 212 W 範例）：[EPS sizing tutorial — Valispace](https://www.valispace.com/wp-content/uploads/2018/12/EPS-sizing-tutorial-1.pdf)
- LEO 單一地面站每天約 3–4 次、每次約 10 分鐘可通訊：[Ground station — Orbital Radar](https://orbitalradar.com/glossary/ground-station)
- GEO 衛星看得到約 42% 的地球、南北緯 81° 以內：[Geostationary orbit — Wikipedia](https://en.wikipedia.org/wiki/Geostationary_orbit)
- 距離 65 倍 → 訊號約弱 4,200 倍（(35,786 ÷ 550)² ≈ 4,233，約 36 dB）：平方反比定律直接計算
- FCC 五年離軌規定（2022 年 9 月通過）：[FCC Adopts 5-Year Rule for Deorbiting Satellites — Via Satellite](https://www.satellitetoday.com/government-military/2022/09/30/fcc-adopts-5-year-rule-for-deorbiting-satellites/)

### 推進系統（比衝）

- 聯胺約 220 s：[A Survey of Hydrazine Monopropellant Thrusters — AIAA](https://arc.aiaa.org/doi/10.2514/6.2026-3090)（穩態約 215–235 s）
- AF-M315E 約 245 s（比聯胺高約 12%）：[Green Propellant Infusion Mission (GPIM) Overview — NASA](https://www.nasa.gov/missions/tech-demonstration/green-propellant-infusion-mission-gpim-overview/)
- MMH/NTO 雙組元約 320 s：[Liquid apogee engine — Wikipedia](https://en.wikipedia.org/wiki/Liquid_apogee_engine)
- 霍爾推進器 SPT-100：1,350 W、比衝 1,600 s、推力約 83 mN：[SPT-100 — Wikipedia](https://en.wikipedia.org/wiki/SPT-100)
- 柵極離子 NSTAR 約 1,900–3,100 s（取 3,100 s）：[NSTAR — Astronautix](http://www.astronautix.com/n/nstar.html)；[Deep Space 1 — Wikipedia](https://en.wikipedia.org/wiki/Deep_Space_1)

> 推進系統乾重與耗電 2,300 W（NSTAR 最大功率）為概念設計等級估算。

### 酬載與子系統

- Planet Dove：約 9 cm 口徑、4 波段（RGB + NIR）、GSD 3.7–4.2 m：[PlanetScope — Planet Docs](https://docs.planet.com/data/imagery/planetscope/)
- WorldView-3：1.1 m 口徑、29 波段、31 cm 全色解析度、617 km、2,800 kg：[WorldView-3 — eoPortal](https://eoportal.org/satellite-missions/worldview-3)
- 繞射極限驗算：1.22 × 550 nm × 617 km ÷ 1.1 m ≈ 0.38 m，與 WorldView-3 實際 0.31 m 同量級；9 cm @ 475 km ≈ 3.5 m，與 Dove 相符
- GOES-R ABI：16 波段、0.5–2 km、每 10 分鐘全圓盤：[ABI — NOAA GOES-R](https://drupal-prod.goesr.woc.noaa.gov/spacesegment/abi.html)
- WorldView X 頻段下傳 800 Mbps：[WorldView-1 — eoPortal](https://www.eoportal.org/satellite-missions/worldview-1)
- 立方衛星 S 頻段下傳約 4–14 Mbps：[ISIS High Data Rate S-band Transmitter](https://www.cubesatshop.com/product/isis-txs-s-band-transmitter/)
- SDO：選擇傾斜地球同步軌道以取得連續連線，每天 1.4 TB、Ka 頻段約 130 Mbps：[SDO — NASA NTRS](https://ntrs.nasa.gov/api/citations/20090027804/downloads/20090027804.pdf)
- ROSA：傳統硬式太陽能板的 3 倍比功率、iROSA 每翼 20+ kW：[ROSA — Redwire](https://rdw.com/product-archive/power/rosa/)
- Vanguard 1（機身貼附式太陽能電池，1958）：[Vanguard 1 — Wikipedia](https://en.wikipedia.org/wiki/Vanguard_1)
- ViaSat-1 約 140 Gbps：一般公開資料（高通量衛星代表）
- Whipple Shield：[Whipple shield — Wikipedia](https://en.wikipedia.org/wiki/Whipple_shield)

### 可靠度與工程餘裕

- 立方衛星約 25% 入軌即失聯、另 12% 早期失效（Swartwout 統計）：[The Space Review](https://thespacereview.com/article/3047/1)
- 概念設計階段質量餘裕 > 30%、「Layout」12–30%：AIAA S-120 / R-020A，整理於 [NASA NTRS](https://ntrs.nasa.gov/api/citations/20120013284/downloads/20120013284.pdf)

> 零件等級的年故障率（商規 90% / 太空級 97% / 冗餘 99.5% 撐過 5 年 LEO）、展開機構 99%、GEO 輻射倍率 1.5、結構屏蔽倍率為**遊戲估算值**：方向與量級符合工程常識（商規零件在 GEO 最脆弱、冗餘最可靠），但不對應單一引用。成本（百萬美元）同樣是量級估算，用於呈現相對取捨。

### 運作期：預備金與異常應變

- NASA 聯合成本與時程信心水準（JCL）70% 政策、未分配預備金（UFE）：[GAO-16-620](https://www.gao.gov/assets/680/678704.pdf)；[SPD-19 — NASA](https://discovery.larc.nasa.gov/PDF_FILES/SPD-19_PI-ledmissions_70JCL.pdf)
- 碰撞機率 1/10,000 為業界閃避門檻（NASA CARA、ISS 紅線）：[NASA NTRS 20180007756](https://ntrs.nasa.gov/api/citations/20180007756/downloads/20180007756.pdf)
- 朱諾號 2016 年氦氣止回閥異常，決定留在 53 天軌道：[NASA's Juno to Remain in Current Orbit — NASA JPL](https://www.jpl.nasa.gov/news/nasas-juno-to-remain-in-current-orbit-at-jupiter/)
- Landsat 7 掃描線校正器 2003 年失效、修復未成功，每張影像缺約 22%：[Landsat 7 — USGS](https://www.usgs.gov/landsat-missions/landsat-7)
- 克卜勒 2013 年第二個反應輪失效後以太陽光壓平衡進行 K2 任務（2014–2018）、哈伯 2024 年改用單陀螺儀模式、機會號（設計 90 火星日，運作至 2018 年）、2009 年銥 33／Cosmos 2251 相撞：廣為記載的太空史事件

> 可挽救故障比例 60%、各應變選項的成本與效果、運作期事件頻率、延長任務每年 $4M，皆為**遊戲估算值**。

### 事件的真實案例

- 2022 年 2 月地磁暴導致 38 顆 Starlink 墜入大氣層：[Starlink to lose about 40 satellites — Light Reading](https://www.lightreading.com/satellite/starlink-to-lose-about-40-satellites-in-wake-of-geomagnetic-storm/d/d-id/775200)
- 1993 年英仙座流星雨期間 Olympus-1 疑似遭撞擊失控：[Shooting Stars Can Shoot Down Satellites — IEEE Spectrum](https://spectrum.ieee.org/shooting-stars-can-shoot-down-satellites)
- 2016 年哨兵 1A（700 km）太陽能板被小於 5 mm 的碎片擊中，損傷區直徑約 40 cm，功率小幅下降但運作正常：[Copernicus Sentinel-1A satellite hit by space particle — ESA](https://www.esa.int/Applications/Observing_the_Earth/Copernicus/Sentinel-1/Copernicus_Sentinel-1A_satellite_hit_by_space_particle)
- 太空碎片分級：10 cm 以上可由地面雷達追蹤並閃避、1 cm 以下無法追蹤只能靠屏蔽（遊戲據此區分「軌道碎片密集」與「微小碎片密集」兩個事件）：ESA Space Debris Office 的公開說明
- 1 cm 鋁珠（約 1.4 g）以 10 km/s 撞擊的動能 ½mv² ≈ 70 kJ，等於 250 kg 物體以 85 km/h 運動：直接計算
- 其他事件與失敗原因引用的史實（Apollo 12 閃電、ADEOS-II、CRS-7、AsiaSat 3、伽利略號天線）均為廣為記載的太空史事件

### 太空天氣（李彥宜整理，2026-10-11 查證）

- NOAA 太空天氣分級：R3（X1 級閃焰）每個太陽週期約 175 次、R4（X10）約 8 次、R5（X20）少於 1 次；G5 極端地磁暴每週期約 4 次：[NOAA Space Weather Scales — SWPC](https://www.swpc.noaa.gov/noaa-scales-explanation)
- 2024 年 5 月 G5 地磁暴：[“Extreme” G5 geomagnetic storm reaches Earth — CBS News](https://www.cbsnews.com/amp/texas/news/severe-geomagnetic-storm-watch-issued-unusual-solar-event)

> 遊戲中「太陽風暴警報」的發生頻率（LEO 約每年 0.09 次、GEO 約 0.07 次）低於真實的 G5 頻率（約每年 0.36 次）。這是為了遊戲節奏所做的簡化：只抽出「需要營運商做決定」的那部分警報。

### 台灣太空任務（李彥宜整理）

- 福衛五號光學遙測酬載（RSI）：口徑 450 mm、720 km 太陽同步軌道、2 m 全色／4 m 多光譜、刈幅 24 km、2017 年由 Falcon 9 發射：[FORMOSAT-5 — CATALYST](https://catalyst.earth/catalyst-system-files/professional-help/references/gdb_r/Formosat-5.html)；[RSI (FORMOSAT-5) — WMO OSCAR](https://space.oscar.wmo.int/instruments/view/rsi_formosat_5)
- 繞射極限驗算：1.22 × 550 nm × 720 km ÷ 0.45 m ≈ 1.1 m，實際 2 m 受限於偵測器像素，兩者一致（繞射極限是理論下限）
- 福衛七號（COSMIC-2）GNSS 掩星：接收穿過大氣層而折射的導航衛星訊號，反推溫度、氣壓、濕度垂直剖面，不受雲層影響，資料用於全球數值天氣預報：TASA／NOAA 公開資料

### 結構材料（李彥宜整理）

- 6061-T6 降伏強度約 276 MPa、7075-T6 約 503 MPa（約 1.8 倍）：鋁合金標準材料性質
- 立方衛星開放式框架、鋁蜂巢夾層板、一體式承力結構的取捨：依李彥宜整理的結構方案比較表

### 姿態控制（梁詠為整理）

- 地球磁場近似偶極場，強度 ∝ 1/r³：(42,157 km ÷ 6,921 km)³ ≈ 226，直接計算
- NASA FASTSAT-HSV01（約 180 kg）僅用三根互相垂直的磁力棒控制姿態：Design and Integration of an All-Magnetic Attitude Control System for FASTSAT-HSV01's Multiple Pointing Objectives（梁詠為提供）
- 韋伯太空望遠鏡 6 顆反應輪，單顆 6,000 rpm 時角動量 68 N·m·s：The Design, Verification, and Performance of the James Webb Space Telescope（梁詠為提供）
- 克卜勒太空望遠鏡 4 顆反應輪、需要 3 顆才能精確指向，2013 年第二顆失效後改為 K2 任務：廣為記載
- 哈伯 2021 年 6 月酬載電腦故障，安全模式約一個月後切換到備援硬體恢復：NASA 公開新聞
- 遊戲中的指向精度（磁力棒 2°、反應輪 0.02°）與各任務的指向需求為**遊戲估算值**，量級符合小衛星磁力棒控制（數度）與星象儀＋反應輪（百分之一度級）的典型表現

### 熱控（梁詠為整理）

- 散熱面輻射：史蒂芬－波茲曼定律，ε = 0.85、20°C 時 εσT⁴ ≈ 355 W/m²；扣掉地球紅外線與反照後的淨散熱量（LEO 250、GEO 330 W/m²）為**遊戲估算值**
- 福衛五號太陽能板背部散熱面：Solar Panel Temperature Reduction Study of FORMOSAT-5 Satellite（梁詠為提供）
- 迴路熱管：Propylene Loop Heat Pipe Design and Thermal Performance（NASA PACE，梁詠為提供）；大型通訊衛星使用熱管與可展開散熱板為業界常識
- 衛星熱控綜述：Advances in satellite thermal management systems: Challenges, innovations, and future directions（梁詠為提供）

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
