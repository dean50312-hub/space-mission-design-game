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

---

## P0（優先度最高：畫面核心，缺了最明顯）

| 項目 | 檔名 | 建議尺寸 | 說明 |
|---|---|---|---|
| 遊戲標題 Logo | `ui/title-logo.png` | 寬 500~700px，高按比例 | 「太空精算師」手繪美術字，取代目前純文字標題。整張圖，不用切割。 |
| 按鈕外框 | `ui/button-frame.png` | 32×32，四角各留 8px 不可縮放邊框 | 九宮格（9-slice）素材：中間可平舖延伸，四角固定不變形，這樣不管按鈕多寬都不會糊掉。技術細節我來處理，你只要照 8px 邊框畫。 |
| 輕型火箭 | `rocket/rocket-light.png` | 64×96（直式） | 火箭本體，選件卡片跟飛行動畫共用 |
| 中型火箭 | `rocket/rocket-medium.png` | 64×96 | 建議比輕型看起來更大/更精緻 |
| 重型火箭 | `rocket/rocket-heavy.png` | 64×96 | 三檔要能一眼看出等級差異 |
| 電力系統×3 | `parts/power-economy.png`<br>`parts/power-standard.png`<br>`parts/power-premium.png` | 64×64 | 太陽能板/電池，經濟→高階建議畫面板越大越多片 |
| 通訊系統×3 | `parts/comm-economy.png`<br>`parts/comm-standard.png`<br>`parts/comm-premium.png` | 64×64 | 天線/收發器 |
| 科學酬載×3 | `parts/science-economy.png`<br>`parts/science-standard.png`<br>`parts/science-premium.png` | 64×64 | 科學儀器 |
| 推進/姿態控制×3 | `parts/propulsion-economy.png`<br>`parts/propulsion-standard.png`<br>`parts/propulsion-premium.png` | 64×64 | 推進器 |
| 結構與屏蔽×3 | `parts/structure-economy.png`<br>`parts/structure-standard.png`<br>`parts/structure-premium.png` | 64×64 | 結構/屏蔽板 |
| 水星 | `Stars/mercury.png` | 來源尺寸不拘（比照 Saturn.png 風格） | 顯示時會縮到約 10px |
| 金星 | `Stars/venus.png` | 同上 | 顯示約 16px |
| 地球 | `Stars/earth.png` | 同上 | 顯示約 18px |
| 火星 | `Stars/mars.png` | 同上 | 顯示約 13px |
| 木星 | `Stars/jupiter.png` | 同上 | 顯示約 30px |
| 天王星 | `Stars/uranus.png` | 同上 | 顯示約 18px |
| 海王星 | `Stars/neptune.png` | 同上 | 顯示約 18px |
| 冥王星 | `Stars/pluto.png` | 同上 | 顯示約 8px |

土星（`Stars/Saturn.png`）已完成 ✅，其餘 8 顆行星風格比照它做即可，尺寸不用精算，我這邊縮放對齊。

---

## P1（高優先：完成後整體質感明顯提升）

| 項目 | 檔名 | 建議尺寸 | 說明 |
|---|---|---|---|
| 面板外框 | `ui/panel-frame.png` | 32×32，8px 邊框（九宮格同按鈕） | 事件卡片、部件卡片、設定列共用的外框裝飾 |
| ORBIT 吉祥物 | `mascot/orbit.png` | 96×96 以上 | 教學對話框用，取代目前的 🤖 emoji |
| 噴射尾焰 | `effects/exhaust-1.png`<br>`effects/exhaust-2.png` | 32×48 | 兩格輪播做火焰閃爍，取代目前 CSS 漸層 |
| 爆炸效果 | `rocket/explosion-1.png`<br>`rocket/explosion-2.png`<br>`rocket/explosion-3.png` | 96×96 | 任務失敗時播放，建議 2~3 格 |
| 事件圖示×10 | `icons/events/solar_flare.png`<br>`geomagnetic_storm.png`<br>`bad_weather.png`<br>`wind_shear.png`<br>`micrometeorite.png`<br>`orbital_congestion.png`<br>`limited_ground_station.png`<br>`cold_snap.png`<br>`budget_cut.png`<br>`nominal.png` | 48×48 | 取代目前的 emoji（☀️🌩️☁️💨🌠🛰️📡❄️💰🌤️） |
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

- [x] 土星 `Stars/Saturn.png`
- [ ] 其餘全部（完成一批就跟我說，我幫你打勾更新）
