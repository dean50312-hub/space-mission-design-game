# 太空精算師 Space Actuary

一款像素風的網頁遊戲，參加 [NASA Space Apps Challenge 2026 — Space Mission Design Game](https://www.spaceappschallenge.org/2026/challenges/space-mission-design-game/) 挑戰。

**線上試玩：** https://dean50312-hub.github.io/space-mission-design-game/

玩家扮演任務設計師，在預算與火箭運力的限制下選擇軌道、火箭與衛星的每個部件，讓「期望任務價值」（任務價值 × 成功機率）最大化——這正是精算師的工作。所有數字都來自真實的太空工程：火箭方程式、繞射極限解析度、軌道幾何、訊號的平方反比衰減、真實火箭的飛行紀錄。

## 遊戲內容

- **五種任務**：高解析度影像、全球氣候監測、颱風即時追蹤、通訊廣播、電離層探測，各自對應真實衛星（WorldView-3、Terra、GOES／向日葵、ViaSat、福衛五號與七號）。正確的軌道不是寫死的規則，而是由物理自然浮現
- **四枚真實火箭**：Electron、PSLV、Falcon 9、Falcon Heavy，可靠度由真實飛行紀錄估計。便宜的火箭省下的錢能買更好的零件，代價是更高的失敗風險
- **衛星設計圖與任務預算表**：在衛星線稿上點選每個部件；成本、質量、電力、散熱、每日資料、預備金、Δv 即時計算，每一行都能點開看原理
- **完整任務模擬**：發射、穿越大氣層（助推器、第一節、整流罩依序分離）、入軌、展開，每一關先公布成功率再擲骰；運作期切換到從北極俯視的真實地球（Natural Earth 海岸線），衛星依真實軌道力學繞行，只有地面站看得到時才能下傳資料
- **運作期決策**：零件故障與太空天氣事件取材自真實案例（克卜勒 K2、朱諾號、Landsat 7……），玩家決定要花預備金搶修還是降級運作
- **精算評分**：設計的期望價值 ÷ 同樣條件下的理論最佳（電腦窮舉所有設計找出），評的是決策品質而不是運氣；理論最佳設計的每個選擇都列出「換成別的會差多少」；另有每種任務 3 枚挑戰勳章與 13 個成就
- **劇情關卡**：四關逐步開放推進與姿態控制、太空環境事件、運作期決策，通關後解鎖自由遊玩；同一關卡住時，吉祥物 ORBIT 會給提示
- **自訂模式**：自己挑任務目標和太空環境事件，比較不同事件如何改變最佳設計
- **學習目標與小測驗**：每關列出可檢驗的學習目標，結果頁用兩題小測驗確認學到了什麼
- 支援中文／English，桌機與手機都能玩

## 在本機執行

不需要安裝任何套件，用任何靜態網頁伺服器開啟專案資料夾即可：

```bash
py -m http.server 5500
```

然後打開 http://localhost:5500/。直接雙擊 `index.html` 也能玩，但部分瀏覽器會擋本機檔案的音樂載入。

## 專案結構

```
index.html          所有畫面
css/style.css       視覺規範（字型、色彩變數、元件樣式）
js/                 遊戲邏輯（純 JavaScript，無建置流程）
  data.js           所有平衡數值，來源見 docs/REFERENCES.md
  mission.js        任務模型：工程預算、任務價值、成功機率
  operations.js     任務時間軸與蒙地卡羅期望值
  scoring.js        精算評分與挑戰勳章
  bestdesigns.js    理論最佳設計表（由工具產生）
image/              像素美術（大多由 tools/ 的腳本程式生成）
audio/bgm/          背景音樂
tools/              產生器：理論最佳設計、像素圖示、衛星設計圖與火箭、面板外框、地球地圖、發射場
docs/               遊戲設計文件、參考資料、美術素材清單
```

調整 `js/data.js` 的平衡數值後，要打開 `tools/best-designs.html` 重新計算理論最佳設計，並把輸出貼進 `js/bestdesigns.js`（忘記的話遊戲會在結果頁當場重算，並在主控台提醒）。

## 文件

- [docs/GDD.md](docs/GDD.md)：遊戲設計文件，記錄每個機制的設計理由與平衡驗證
- [docs/REFERENCES.md](docs/REFERENCES.md)：所有真實數據的出處，以及哪些是遊戲估算值
- [docs/ASSET_LIST.md](docs/ASSET_LIST.md)：美術素材清單

## 致謝與授權

- 字型：[俐方體11號 Cubic 11](https://github.com/ACh-K/Cubic-11)（SIL OFL 1.1）、Noto Sans TC（SIL OFL 1.1）
- 地圖資料：[Natural Earth](https://www.naturalearthdata.com/)（公有領域）
- 圖表：[Chart.js](https://www.chartjs.org/)（MIT）
- 背景音樂為團隊成員原創；像素美術由專案內的腳本程式生成，`image/Stars/Saturn.png` 為團隊成員提供
