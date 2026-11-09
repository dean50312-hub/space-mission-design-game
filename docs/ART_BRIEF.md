# 美術協作說明 — 太空精算師（Space Actuary）

給協助生成美術圖片的 AI／協作者。請先完整讀完這份說明再開始畫。

- 遊戲網址：<https://dean50312-hub.github.io/space-mission-design-game/>
- GitHub：<https://github.com/dean50312-hub/space-mission-design-game>
- 參加比賽：NASA Space Apps Challenge 2026「Space Mission Design Game」
- 製作團隊：Mission Impaysible

## 一、這是什麼遊戲

像素風的教育遊戲。玩家在預算、質量和風險之間取捨，設計一顆衛星：選軌道、火箭和零件，發射後模擬任務運作，最後用「精算評分」看設計好不好。支援 1～4 人線上合作。

**遊戲原則：符合真實太空科學。** 每個零件、火箭都對應真實的硬體，圖片也要畫得像真的東西，不能是科幻造型。

## 二、你的工作範圍

1. **只產出圖片，不要修改程式碼。** 圖片交給我們，由專案的程式負責人（Claude Code）整合進遊戲、檢查畫面。如果你對畫面或程式有建議，請寫成文字建議，不要直接改 CSS／JS。
2. **只替換既有圖片，檔名一字不改。** 換掉同名檔案，遊戲就會自動使用新圖。想新增目前沒有的圖片（例如新的主畫面插圖），請先提案，我們討論後再做。
3. **一次完成一整組**（例如全部 29 張零件圖），不要東換一張、西換一張，不然新舊風格混在一起會很突兀。

## 三、硬性規格（每張都要遵守）

| 項目 | 規定 |
|---|---|
| 風格 | 像素畫（pixel art）。不要漸層、不要反鋸齒（antialiasing）、不要模糊邊緣、不要照片質感 |
| 格式 | PNG，**透明背景**（RGBA） |
| 尺寸 | 每張圖的最終尺寸見下面的清單，**必須完全一樣** |
| 交付方式 | 因為 AI 很難直接畫出 32×32 的像素圖，請在 **8 倍大的畫布** 上畫：每個「像素」是 8×8 的純色方塊，對齊格線。例如 64×64 的圖請交 512×512。我們會用最近鄰縮小回原尺寸；如果方塊沒對齊格線，縮小後就會糊掉 |
| 顏色數 | 每張圖最多約 16 色，用平塗色塊，不要漸層 |
| 外框 | 主體加 1 像素深色外框（`#070a24`），在深藍背景上才看得清楚 |
| 光源 | 統一從左上方打光 |
| 文字 | **圖片裡不能有任何文字或數字**（遊戲有中英雙語，文字由程式顯示） |
| 商標 | 不能出現 NASA 標誌、SpaceX 等真實公司的商標、國旗或標誌 |
| 構圖 | 主體置中，四周留約 1～2 像素空白，不要碰到邊 |

### 遊戲色票（請以這些顏色為主）

| 用途 | 色碼 |
|---|---|
| 背景（最深） | `#070a24` |
| 背景 | `#0b0e2b` |
| 面板 | `#141838`、`#1b2050` |
| 線條 | `#262c63`、`#3a4380` |
| 主要文字／亮白 | `#e8ecff` |
| 次要灰藍 | `#9aa3d1`、`#6b73a3` |
| 強調青色 | `#4fd1ff`、`#1f7fb3` |
| 金色（獎勵、太陽能、隔熱毯） | `#ffd166`、`#d18b1f` |
| 紅（警告、失敗） | `#ff5566` |
| 綠（成功） | `#57e389` |
| 橘 | `#ff9f43` |
| 紫（電漿、離子） | `#b388ff` |

金屬零件可以用灰色系（例如 `#c9cfe8`、`#8a93bd`、`#4b5385`），但整體要和上面的色調協調。

## 四、不要替換的圖片（程式依賴它們的形狀）

以下圖片和程式的座標綁在一起，換了會讓動畫或點擊位置對不上，**請不要重畫**：

- `image/rocket/rocket-*.png`（4 枚火箭）：分離動畫、尾焰位置都是照現在的形狀對齊的
- `image/rocket/blueprint-sat-*.png`（3 張衛星設計圖）：零件熱點按鈕的位置照圖上零件擺放
- `image/rocket/exhaust.png`（尾焰）
- `image/ui/*`（按鈕外框、面板外框、發射場、星空）：九宮格切圖，尺寸和邊界有特殊規定
- `image/Stars/*`（行星）

如果你覺得這些也該重畫，請先提案說明，不要直接做。

## 五、要做的圖片（依優先順序）

### 優先度 1：已知問題

| 檔名 | 尺寸 | 內容 |
|---|---|---|
| `parts/payload-optical-premium.png` | 64×64 | 1.1 m 口徑長鏡筒太空望遠鏡（參考 WorldView-3）：白色或金色隔熱毯包覆的圓筒鏡筒、遮光罩朝下、旁邊有星象儀。**現在的圖畫成韋伯望遠鏡的金色六角鏡，跟真實的不符，要修正** |

### 優先度 2：衛星零件（29 張，64×64，`image/parts/`）

每種零件有三個等級：經濟（economy）、標準（standard）、高階（premium）。同一系統的三張要看得出「越來越大、越來越精密」。

| 檔名 | 真實硬體 |
|---|---|
| `power-economy.png` | 機身貼附式太陽能電池：方盒外殼表面貼滿深藍色電池片，沒有展開的板子 |
| `power-standard.png` | 展開式三接面砷化鎵太陽能板：兩片深藍色硬式面板從機身展開 |
| `power-premium.png` | 捲展式太陽能板（ROSA）：像捲尺一樣捲開的長條柔性太陽能翼 |
| `comm-economy.png` | S 頻段立方衛星小天線：小盒子加一兩根短棒狀天線 |
| `comm-standard.png` | X 頻段可轉向碟形天線（中型拋物面碟） |
| `comm-premium.png` | Ka 頻段高增益天線：大型拋物面碟，可加一個小的備份 |
| `attitude-economy.png` | 磁力棒：三根互相垂直、纏著銅線圈的棒子 |
| `attitude-standard.png` | 3 顆反應輪（圓盤狀飛輪）＋一個星象儀（小鏡筒） |
| `attitude-premium.png` | 4 顆反應輪排成金字塔＋星象儀 |
| `structure-economy.png` | 6061 鋁合金開放式框架：四根角柱，看得到裡面一層層電路板（立方衛星） |
| `structure-standard.png` | 鋁蜂巢夾層板＋中央承力筒（看得到蜂巢格紋） |
| `structure-premium.png` | 7075 鋁合金一體式厚外殼，外面再加一層薄的惠普爾防護板（可畫一兩個碎片撞擊點） |
| `computer-economy.png` | 輕量商規電腦（GomSpace NanoMind A3200 級）：一片小小的綠色立方衛星電路板，上面一顆黑色處理器 |
| `computer-standard.png` | 大容量電腦（EnduroSat OBC 級＋固態記錄器）：幾片疊起來的電路板，旁邊一個銀色大容量儲存盒 |
| `computer-premium.png` | 抗輻射電腦（BAE RAD750 3U 級，雙機備份）：兩台厚鋁外殼的機箱並排，有散熱鰭片和金色連接器。**注意：三個電腦等級各有長處，「抗輻射」不代表比較先進，而是比較耐操、比較笨重** |
| `payload-optical-economy.png` | 9 cm 口徑立方衛星相機（Planet Labs Dove 級，小方盒加小鏡頭） |
| `payload-optical-standard.png` | 50 cm 口徑多光譜成像儀（中型鏡筒） |
| `payload-optical-premium.png` | 見優先度 1 |
| `payload-transponder-economy.png` | 少量 Ku 頻段轉發器：金色隔熱毯酬載艙＋一個饋源喇叭 |
| `payload-transponder-standard.png` | 多波束 Ka 頻段：酬載艙＋多個饋源喇叭 |
| `payload-transponder-premium.png` | 高通量衛星：酬載艙＋兩面大型展開式反射器 |
| `payload-plasma-economy.png` | 多針朗繆爾探針：細長伸展桿末端幾根細針 |
| `payload-plasma-standard.png` | 福衛五號 AIP 級電漿探測儀：小盒子正面有圓形感測口 |
| `payload-plasma-premium.png` | 電漿探測儀＋GNSS 掩星天線（扁平貼片天線陣列） |
| `fuel-hydrazine.png` | 聯胺：球形貯箱，橘色危險標示帶，加一個小噴嘴 |
| `fuel-af_m315e.png` | 綠色推進劑：球形貯箱，綠色標示帶 |
| `fuel-biprop.png` | 雙組元 MMH/NTO：兩個貯箱（燃料＋氧化劑）＋鐘形噴嘴 |
| `fuel-hall.png` | 霍爾推進器：環形通道，噴出青色電漿 |
| `fuel-ion.png` | 柵極離子推進器：圓形柵網面板，噴出藍紫色離子束 |

### 優先度 3：圖示（`image/icons/`）

| 檔名 | 尺寸 | 內容 |
|---|---|---|
| `objective-imaging.png` | 32×32 | 高解析度影像任務：從上空看城市街道（可加一個對焦框） |
| `objective-climate.png` | 32×32 | 全球氣候監測：地球加溫度計，或極地冰帽 |
| `objective-weather.png` | 32×32 | 颱風追蹤：從上空看的颱風漩渦 |
| `objective-comms.png` | 32×32 | 通訊廣播：地面碟型天線發出訊號波 |
| `objective-ionosphere.png` | 32×32 | 電離層探測：地球上方的彩色極光帶 |
| `event-solar_flare.png` | 32×32 | 太陽粒子事件：太陽噴發閃焰 |
| `event-geomagnetic_storm.png` | 32×32 | 地磁暴：地球被扭曲的磁力線包圍 |
| `event-bad_weather.png` | 32×32 | 雷雨延誤發射：雷雨雲加閃電 |
| `event-small_debris.png` | 32×32 | 微小碎片：一群細小碎屑 |
| `event-orbital_congestion.png` | 32×32 | 軌道碎片密集：較大的碎片，帶警示 |
| `event-limited_ground_station.png` | 32×32 | 地面站維修：碟型天線加扳手 |
| `event-mass_growth.png` | 32×32 | 質量增長：秤或砝碼，指針往重的方向 |
| `event-budget_cut.png` | 32×32 | 預算刪減：被剪刀剪開的鈔票或錢袋 |
| `event-export_control.png` | 32×32 | 出口管制：上鎖的箱子或貨櫃 |
| `event-launch_manifest.png` | 32×32 | 發射排程擁擠：排滿的日曆 |
| `event-flagship.png` | 32×32 | 國家旗艦計畫：獎章或旗幟（**不要畫真實國旗**） |
| `event-nominal.png` | 32×32 | 一切正常：平靜的太陽或打勾 |
| `medal-s_rank.png` | 32×32 | 勳章「精算大師」：金色星形勳章 |
| `medal-frugal.png` | 32×32 | 勳章「小預算大任務」：勳章加小錢幣 |
| `medal-robust.png` | 32×32 | 勳章「萬無一失」：盾牌形勳章 |
| `medal-all_electric.png` | 32×32 | 勳章「全電推進」：勳章加閃電 |
| `medal-fast_service.png` | 32×32 | 勳章「即刻開播」：勳章加火焰或碼表 |
| `medal-sure_launch.png` | 32×32 | 勳章「穩穩送上天」：勳章加火箭 |
| `achievement-first_orbit.png` | 32×32 | 首次入軌成功 |
| `achievement-under_budget.png` | 32×32 | 精打細算（省錢） |
| `achievement-storm_survivor.png` | 32×32 | 力抗風暴（在太空天氣中存活） |
| `achievement-all_rounder.png` | 32×32 | 全能設計（每項都均衡） |
| `achievement-glorious_failure.png` | 32×32 | 雖敗猶榮（失敗但設計很好） |
| `achievement-never_give_up.png` | 32×32 | 屢敗屢戰 |
| `achievement-bare_bones.png` | 32×32 | 克難精神（全用最便宜的零件） |
| `achievement-top_of_the_line.png` | 32×32 | 不計成本（全用最高階） |
| `achievement-so_close.png` | 32×32 | 功虧一簣 |
| `achievement-crisis_management.png` | 32×32 | 危機處理（成功處理異常） |
| `achievement-flawless_mission.png` | 32×32 | 完美無瑕 |
| `achievement-extended_mission.png` | 32×32 | 延長任務（超過設計壽命） |
| `achievement-space_polymath.png` | 32×32 | 太空全才（每種任務都完成過） |
| `locked.png` | 32×32 | 未解鎖：灰色的鎖 |
| `mascot-orbit.png` | 32×32 | 吉祥物 ORBIT：小機器人頭，青色護目鏡、頭頂紅色天線燈（保留這些特徵） |
| `orbit-leo.png`、`orbit-geo.png` | 48×48 | 低軌道與地球同步軌道：地球加一圈軌道和小衛星。GEO 的軌道圈要明顯比 LEO 大 |

### 優先度 4：小圖示（16×16，`image/icons/glyph-*.png`）

顯示在文字行內，要非常簡單、一眼就懂，最多 4～5 色：
`add`（加號）、`ban`（禁止）、`book`（書／圖鑑）、`check`（打勾）、`cost`（錢幣）、`cross`（叉）、`data`（資料）、`dv`（速度變化箭頭）、`mass`（砝碼）、`power`（閃電）、`reserve`（保險箱／預備金）、`signal`（訊號天線）、`star`（星星）、`thermal`（溫度計）、`tip`（燈泡）、`wait`（沙漏）、`warn`（警告三角形）。

## 六、交付與驗收

1. 依上面的檔名、8 倍大尺寸交付 PNG，資料夾結構和遊戲相同（`parts/`、`icons/`）。
2. 每組附一張「全部排在一起」的預覽圖，方便一次比較風格是否一致。
3. 我們會縮小、放進遊戲，在深色背景上檢查：輪廓清不清楚、三個等級分不分得出來、和其他畫面協不協調，有問題再請你修改。
4. 依比賽規定，提交時會註明部分美術由 AI 生成。
