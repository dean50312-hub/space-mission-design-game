# 美術協作說明（第四輪）— 介面改版概念圖

給協助生成美術的 AI／協作者。這一輪**不是做素材**，而是畫「整個畫面看起來應該長怎樣」的概念圖。團隊挑好方向後，由程式負責人用 HTML/CSS 實作，所以概念圖要「做得出來」（見第四節）。

- 遊戲網址：<https://dean50312-hub.github.io/space-mission-design-game/>（請先實際玩一輪，看懂每個畫面有什麼）
- GitHub：<https://github.com/dean50312-hub/space-mission-design-game>

## 一、為什麼要改

現在的介面是「單一欄、一個一個方框往下疊」，資訊都在，但看起來樸素、像表單。我們想要更有沉浸感、更像在太空任務控制中心工作的介面。問題在**整體版面配置和氣氛**，不是外框的花紋。

## 二、風格方向：任務控制中心 × 像素風

- 參考：NASA 任務控制中心、太空船駕駛艙的儀表板、科幻遊戲的 HUD。
- 保留像素風（遊戲的圖示、零件、火箭都是像素圖），但介面可以有光暈、掃描線、儀表、指示燈、角括號、格線等控制台元素。
- 色票沿用 `docs/ART_BRIEF.md` 的遊戲色票（深藍底、青色主色、金色獎勵、紅色警報、綠色正常）。
- 字體：標題、按鈕、數字用 **Press Start 2P**（像素字），說明文字用 **IBM Plex Sans**。
- 遊戲全英文。

## 三、要畫的畫面

每張都是桌機尺寸 **1440×900**。請畫**兩種方向**（A、B）的首頁和設計畫面，讓團隊比較；結果頁畫一張即可。

- **方向 A：密集控制台**：像真的任務控制中心，資訊密、儀表多、很多小指示燈。
- **方向 B：俐落 HUD**：像科幻電影的抬頭顯示器，留白多、線條細、重點發光。

### 1. 首頁（A、B 各一張）
必須包含：
- 標題「Space Actuary」、副標「SPACE MISSION DESIGN GAME」、團隊名「Mission Impaysible」
- 主選單：Campaign（附 4 關進度：Basics／Propulsion／Space weather／Operations）、Free Play（未解鎖時是灰的）、Custom Mission、Multiplayer、Space Codex、Achievements、Settings
- Mission Records：5 種任務（High-Resolution Imaging、Global Climate Monitoring、Real-Time Typhoon Tracking、Broadband Communications、Ionosphere Probe），每個有任務圖示、最佳分數（例如「S 97」）、3 枚勳章
- 背景主視覺：地球、星空、發射台上的火箭（可以用 `image/rocket/` 的火箭）

### 2. 設計衛星畫面（A、B 各一張）— 最重要
這是玩家花最多時間的畫面，必須包含：
- 最上方：任務名稱＋需求（例如「High-Resolution Imaging · Low Earth Orbit — resolution ≤ 0.5 m · images reach the ground every day」）
- 步驟進度：Briefing → Design → Launch → Report（目前在 Design）
- 火箭：已選的火箭（圖片、名稱、價格、運力、可靠度）和「Change Rocket」
- **衛星設計圖**：衛星線稿上有 7 個可點的零件位置（Propulsion、Attitude Control、Structure & Shielding、Flight Computer、Power System、Communications、Payload），已選的零件顯示零件圖
- 零件選單：點一個零件位置後出現 3 張選項卡（零件圖、等級名稱、數值，例如「Handles 4,000 Gbit/day · 5 W · 2 kg · $1.5M」、一行說明）
- **任務預算表**：最醒目的是「Expected mission value 84%」；另有成本（$144.8M / $145M）、質量（1,090 / 1,750 kg）、電力、散熱、每日資料、預備金、Δv 等 7 條，每條是數值＋進度條，超標時變紅；下面是 6 個任務價值因子和 3 個可靠度數字
- 按鈕：「Back to Mission Briefing」「Launch!」（發射是主要按鈕，要最醒目）

### 3. 結果頁（一張，用你覺得比較好的方向）
必須包含：
- 標題「Mission Accomplished!」或「Mission Failed」
- 評分：大大的等級（S／A／B／C／D）＋「97 / 100」＋一句說明
- 實際交付 vs. 期望價值（例如 58% vs. 50%）、最大損失的原因
- 3 枚挑戰勳章（拿到的發亮、沒拿到的變暗）
- 「任務價值去哪了」的長條圖
- 按鈕：「Play Again」「Back to Home」

### 4. 選做：手機版
設計畫面的手機版一張（390×844），看三欄要怎麼疊成一欄。

## 四、讓概念圖「做得出來」的規定

1. **只放上面列出的元素**，不要發明遊戲沒有的功能（例如角色、商店、地圖）。可以加純裝飾（指示燈、格線、掃描線）。
2. **面板是矩形**，可以有切角、角括號、發光邊；不要 3D 透視、弧形螢幕、斜放的面板。
3. **文字要短、要好讀**：按鈕上的字和數字照上面寫的放，不要整片小到看不清楚的假文字。
4. 用遊戲現有的圖：零件圖在 `image/parts/`、任務和事件圖示在 `image/icons/`、火箭在 `image/rocket/`、衛星設計圖在 `image/rocket/blueprint-sat-optical.png`。
5. 需要新的裝飾素材（例如儀表外框、背景紋理）沒關係，請在說明裡列出來，下一輪再畫。

## 五、交付方式

1. 檔案放在 `output/ui-concepts/`：`home-A.png`、`home-B.png`、`design-A.png`、`design-B.png`、`results.png`（選做 `design-mobile.png`）。
2. 附一份簡短說明：每個方向的版面安排、配色重點、用到的效果（發光、掃描線等），以及需要新畫的裝飾素材清單。
