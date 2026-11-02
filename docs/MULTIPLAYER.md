# 多人連線設定（Firebase）

多人模式用 Firebase Realtime Database 即時同步房間資料。網站本身仍放在 GitHub Pages，不需要自己架伺服器。免費的 Spark 方案最多同時 100 個連線，約 25 間 4 人房。

已設定完成（專案 space-c-16630），js/netconfig.js 裡有設定。若 netconfig.js 是 null，正式網站上不會顯示「多人連線」按鈕。開發測試可以在網址加上 `?net=local`，用同一個瀏覽器的多個分頁互連（不需要 Firebase）。

## 一、建立 Firebase 專案（組員用自己的 Google 帳號）

1. 到 <https://console.firebase.google.com/> →「新增專案」，名稱自訂（例如 `space-actuary`）。Google Analytics 可以關掉。
2. 左側選單「資料庫與儲存空間（Databases & Storage）→ Realtime Database」（舊版主控台叫「建構 → Realtime Database」）→「建立資料庫」。注意是 Realtime Database，不是 Firestore Database。
   - 位置選「新加坡（asia-southeast1）」，台灣連線比較快。
   - 安全規則先選「以鎖定模式啟動」，下一步再換成我們的規則。
3. 建好後頁面上方會出現「資料／規則／備份／用量」分頁。點「規則」，整段換成下面這份，按「發布」：

```json
{
  "rules": {
    "rooms": {
      "$code": {
        ".read": "$code.matches(/^[A-HJKMNP-Z2-9]{4}$/)",
        ".write": "$code.matches(/^[A-HJKMNP-Z2-9]{4}$/)"
      }
    }
  }
}
```

   這份規則的意思是：只能讀寫「rooms/四碼房號」底下的資料，而且房號要符合遊戲產生的格式。沒有房號的人列不出所有房間。

4. 左上角齒輪「專案設定 → 一般」→ 最下面「你的應用程式」→ 按 `</>`（網頁）註冊一個應用程式（不用勾 Hosting）。
5. 畫面會出現一段 `const firebaseConfig = { ... }`，把整段大括號內容傳給負責程式的組員。

## 二、填進遊戲

打開 `js/netconfig.js`，把 `null` 換成上一步的設定：

```js
const FIREBASE_CONFIG = {
  apiKey: "...",
  authDomain: "....firebaseapp.com",
  databaseURL: "https://....asia-southeast1.firebasedatabase.app",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "...",
};
```

一定要有 `databaseURL`。如果設定裡沒有，到 Realtime Database 頁面最上方複製網址補上。

這段設定本來就會出現在網頁原始碼裡，不是密碼；能寫什麼由上面的資料庫規則決定。

## 三、玩法流程

1. 一人按「多人連線 → 建立房間」，畫面出現 4 碼房號。
2. 隊友在自己的裝置按「多人連線」，輸入房號加入（最多 4 人）。
3. 每人認領角色；4 個角色都要有人負責，人少時一人可以兼任：
   - 任務總監：軌道、火箭、整體預算
   - 酬載科學家：酬載
   - 系統工程師：電力、結構、姿態控制
   - 通訊與飛控：通訊、推進；運作期的地面站上行和異常決策
4. 房主選任務目標和太空事件（或隨機），按「開始任務」。
5. 任務總監選軌道後進入設計；每個人只能改自己負責的項目，但看得到同一張設計圖和預算表。
6. 全員按「準備發射」才會發射；任何人再改設計，所有人的「準備好」都會取消。
7. 發射與運作的結果由房主送出的同一個亂數種子決定，所有人看到的結果完全一樣。結果頁有「團隊分工報告」。
8. 房主按「回到房間大廳」開下一個任務。

## 技術說明

- `js/net.js`：資料層，Firebase 與本機測試兩種後端，介面相同。
- `js/multiplayer.js`：房間、角色、權限、階段切換與同步。
- 房間資料結構：`rooms/{房號}` = `{ hostId, phase, setup, mission, players, roles, design, flight, decisions }`。
- 玩家關掉分頁或斷線時，Firebase 會自動把他移出房間；房主離開時由最早加入的玩家接手。
- 已結束的房間會留在資料庫裡（每間只有幾 KB）。如果之後需要，可以在 Firebase 主控台手動清掉 `rooms`。
