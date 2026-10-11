# 美術素材清單 — 太空精算師

這是一份工作清單，用來追蹤目前哪些畫面元素還是色塊/emoji 佔位，哪些已經換成真的美術素材。畫完/生成完丟進對應資料夾、告訴我路徑，我就會幫你接上去並確認效果。

## 資料夾規則

```
image/
  Stars/      行星（已存在，Saturn.png 已完成）
  rocket/     火箭本體、爆炸效果
  effects/    噴射尾焰、雲朵
  parts/      衛星部件圖示（5 類 × 3 檔）
  icons/      事件圖示、成就圖示
  ui/         按鈕外框、面板外框、標題 Logo
  mascot/     ORBIT 吉祥物
```

檔名一律用**英文小寫 + 底線/連字號**，且盡量對應遊戲內部的 id（見下表「檔名」欄），這樣我串接時不用另外對照，也不會生成完才發現名字對不上。

## 美術素材來源選項

- **Claude 直接用程式碼生成**：適合幾何形狀類（行星、UI 按鈕/面板外框），零成本、色盤可控、改起來便宜。目前 8 顆行星已用這個方式完成。
- **[Kenney.nl](https://kenney.nl/)**：免費 CC0 現成素材包，免註冊直接下載，可商用。跟本專案相關的有 [Planets](https://kenney.nl/assets/planets)、[Simple Space](https://kenney.nl/assets/simple-space)（火箭/太空船參考）、[UI Pack - Pixel Adventure](https://kenney.nl/assets/ui-pack-pixel-adventure)（像素風按鈕/面板，但配色偏奇幻風，可能要重新上色）。適合拿現成的，不用等生成。
- **[Retro Diffusion](https://retrodiffusion.ai/)＋PixelLab**：專門的像素風 AI 生成工具（免費試用額度），輸出網格對齊、色盤乾淨，適合角色/有機造型（例如 ORBIT 吉祥物）這種程式碼公式畫不出來的東西。需要自行註冊帳號。

---

## P0（優先度最高：畫面核心，缺了最明顯）

| 項目 | 檔名 | 建議尺寸 | 說明 |
|---|---|---|---|
| 遊戲標題 Logo | `ui/title-logo.png` | 寬 500~700px，高按比例 | 「太空精算師」手繪美術字，取代目前純文字標題。整張圖，不用切割。 |
| ~~按鈕外框~~ ✅ | `ui/button-frame.png` | 32×32 | 已完成：程式碼生成，機械控制台風格（拉絲金屬+四角螺絲+青色 LED 邊線），9-slice 接進 `.btn`，全站按鈕共用 |
| ~~輕型火箭~~ ✅ | `rocket/rocket-light.png` | — | 已完成：致敬 Rocket Lab Electron（碳纖維黑色小型火箭） |
| ~~中型火箭~~ ✅ | `rocket/rocket-medium.png` | — | 已完成：致敬 SpaceX Falcon 9（白色機身+柵格翼） |
| ~~重型火箭~~ ✅ | `rocket/rocket-heavy.png` | — | 已完成：致敬 SpaceX Falcon Heavy（中央核心+雙側助推器） |
| ~~火箭圖紙×3~~ ✅ | `rocket/blueprint-light.png`<br>`rocket/blueprint-medium.png`<br>`rocket/blueprint-heavy.png` | 240×480 | 已完成：程式碼生成的純線條技術圖紙版火箭，供選件畫面的「圖紙+熱點」互動使用 |
| ~~電力系統×3~~ ✅ | `parts/power-economy.png`<br>`parts/power-standard.png`<br>`parts/power-premium.png` | — | 已完成：程式碼生成（機身貼附式電池/展開式太陽能板/ROSA 捲展式太陽能板）。v2 把高階從 RTG 換成 ROSA：地球軌道衛星實際上用太陽能，RTG 功率只有約 100 W |
| ~~通訊系統×3~~ ✅ | `parts/comm-economy.png`<br>`parts/comm-standard.png`<br>`parts/comm-premium.png` | — | 已完成：程式碼生成（S 頻段小天線/X 頻段碟形天線/Ka 頻段高增益雙碟） |
| ~~光學酬載×3~~ ✅ | `parts/payload-optical-economy.png`<br>`parts/payload-optical-standard.png`<br>`parts/payload-optical-premium.png` | — | 已完成（v2 由 science-*.png 更名）：立方衛星相機/多光譜成像儀/大口徑望遠鏡。高階目前仍是 JWST 金色六角鏡造型，與 WorldView-3 的實際外觀不符，之後可重畫成長鏡筒望遠鏡 |
| ~~通訊酬載（轉發器）×3~~ ✅ | `parts/payload-transponder-economy.png`<br>`parts/payload-transponder-standard.png`<br>`parts/payload-transponder-premium.png` | 64×64 | 已完成：程式碼生成（金色隔熱毯酬載艙＋饋源喇叭，高階加兩面大型反射器），供通訊任務使用 |
| ~~推進系統×5~~ ✅ | `parts/fuel-hydrazine.png`<br>`parts/fuel-af_m315e.png`<br>`parts/fuel-biprop.png`<br>`parts/fuel-ion.png`<br>`parts/fuel-hall.png` | 64×64 | 已完成：程式碼生成（聯胺=橘色危害帶球型貯箱／AF-M315E=綠色球型貯箱／雙組元=燃料＋氧化劑雙球槽＋鐘形噴嘴／離子=柵極面盤+藍紫電漿束／霍爾=環形通道+青色電漿光暈）。v2 以雙組元取代雙氧水 |
| ~~姿態控制×3~~ ✅ | `parts/attitude-economy.png`<br>`parts/attitude-standard.png`<br>`parts/attitude-premium.png` | 64×64 | 已完成（2026-10-11）：程式碼生成（三根銅線圈磁力棒＋磁力線／3 顆反應輪＋星象儀／4 顆反應輪＋星象儀） |
| ~~結構與屏蔽×3~~ ✅ | `parts/structure-economy.png`<br>`parts/structure-standard.png`<br>`parts/structure-premium.png` | 64×64 | 已完成（2026-10-11 重畫）：程式碼生成，改成真實衛星結構——6061 開放式框架（看得到裡面的電路板）/鋁蜂巢夾層板剖面/7075 一體式外殼＋惠普爾犧牲板與碎片撞擊火花 |
| ~~地球~~ | ~~`Stars/earth.png`~~ | — | **不需要**——火箭本來就是從地表發射，太空背景裡再放一顆地球邏輯不通，已從清單移除 |

太陽系其餘 8 顆行星（水星、金星、火星、木星、土星、天王星、海王星、冥王星）皆已完成 ✅，用 Python/Pillow 程式碼直接產生像素風圖片（圓形遮罩＋明暗分帶＋雜訊/條紋），不是手繪也不是 AI 生成，色盤跟畫風可隨時調整重繪，成本很低。

---

## P1（高優先：完成後整體質感明顯提升）

| 項目 | 檔名 | 建議尺寸 | 說明 |
|---|---|---|---|
| 面板外框 | `ui/panel-frame.png` | 32×32，8px 邊框（九宮格同按鈕） | 事件卡片、部件卡片、設定列共用的外框裝飾 |
| ORBIT 吉祥物 | `mascot/orbit.png` | 96×96 以上 | 教學對話框用，取代目前的 🤖 emoji |
| 噴射尾焰 | `effects/exhaust-1.png`<br>`effects/exhaust-2.png` | 32×48 | 兩格輪播做火焰閃爍，取代目前 CSS 漸層 |
| ~~爆炸效果~~ ✅ | `rocket/explosion-1.png`<br>`rocket/explosion-2.png`<br>`rocket/explosion-3.png` | 64×64 | 已完成：程式碼生成 3 格（亮核心→火球→煙塵與碎片），發射／爬升失敗時播放 |
| 事件圖示×12 | `icons/events/solar_flare.png`<br>`geomagnetic_storm.png`<br>`bad_weather.png`<br>`small_debris.png`<br>`orbital_congestion.png`<br>`limited_ground_station.png`<br>`mass_growth.png`<br>`budget_cut.png`<br>`export_control.png`<br>`launch_manifest.png`<br>`flagship.png`<br>`nominal.png` | 48×48 | 取代目前的 emoji（☀️🌩️⛈️🌠🛰️📡⚖️💰🚫📅🏛️🌤️）。v2 移除風切、低溫，新增質量增長；2026-10-11 新增三個限制型事件 |
| 成就圖示×7 | `icons/achievements/first_orbit.png`<br>`under_budget.png`<br>`storm_survivor.png`<br>`all_rounder.png`<br>`glorious_failure.png`<br>`never_give_up.png`<br>`locked.png` | 48×48 | 最後一個是「尚未解鎖」的問號/鎖頭圖示 |

---

## P2（有餘力再做：錦上添花）

| 項目 | 檔名 | 建議尺寸 | 說明 |
|---|---|---|---|
| 雲朵 | `effects/cloud.png` | 96×36 | 目前 CSS 畫的雲朵勉強堪用，畫一張手繪版可重複擺放多個位置 |
| 發射場地面 | `ui/ground-tile.png` | 可平舖尺寸，例如 128×64 | 取代目前純色漸層地面 |
| 發射塔 | `ui/launchpad.png` | 依構圖 | 火箭起飛位置的裝飾物 |
| 星星 | `effects/star.png` | 8×8 或更小 | 目前 CSS 光點已經夠用，除非想要更有造型的星星 |
| 按鈕 hover 樣式 | `ui/button-frame-hover.png` | 同按鈕外框 | 滑鼠移過去的變化樣式 |
| 計量條外框 | `ui/progress-bar-frame.png` | 依版面 | 預算/質量條的裝飾外框 |

---

## 進度追蹤

- [x] 太陽系 8 顆行星（水星/金星/火星/木星/土星/天王星/海王星/冥王星，程式碼生成）
- [x] 按鈕外框（機械控制台風格，程式碼生成）
- [x] 火箭 3 檔（致敬 Electron / Falcon 9 / Falcon Heavy，程式碼生成）
- [x] 火箭＋4 個子系統（電力/通訊/科學/結構）的真實原型文字簡介，已接進選件畫面
- [x] 4 個子系統×3 檔＝12 張部件圖示（程式碼生成，已接進選件畫面）
- [x] 3 張火箭圖紙（程式碼生成純線條技術圖），選件畫面改為「先選火箭→下方出現圖紙→點部件熱點展開選單」的互動方式
- [x] 5 個燃料圖示（程式碼生成，已接進選件畫面）
- [x] v2 真實模型新增：ROSA 太陽能板、雙組元推進、通訊轉發器×3（程式碼生成）
- [ ] 光學酬載高階重畫成長鏡筒望遠鏡（目前 JWST 六角鏡造型與 WorldView-3 不符）
- [x] 爆炸效果 3 格（程式碼生成）；運作期的地球改用 canvas 即時繪製（北極俯視、比例正確、Natural Earth 真實海岸線，資料在 js/earthmap.js），不需要圖檔
- [ ] 標題 Logo、面板外框、ORBIT 吉祥物、尾焰、事件圖示×12、成就圖示×8
- [x] 背景音樂 3 首（胡宥彥原創）：`audio/bgm/space.mp3`（宇宙氛圍：首頁、結果、運作期）、`lab.mp3`（實驗室：簡報、設計）、`launch.mp3`（發射）。原始 WAV 轉成 160 kbps MP3（26 MB → 3 MB），每首 16 小節＋殘響尾音，在第 16 小節結束時接下一輪形成無縫循環
- [ ] P2 項目（雲朵、地面裝飾等）
