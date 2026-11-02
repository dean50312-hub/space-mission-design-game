// 多人連線的資料層：房間是一份 JSON（rooms/{房號}），任何人改動都會即時推給房間裡的所有人。
// 正式版用 Firebase Realtime Database；網址加上 ?net=local 時改用本機後端（同一個瀏覽器的分頁互連），開發測試用。

const FIREBASE_SDK_VERSION = "10.14.1";

function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error("load " + src));
    document.head.appendChild(s);
  });
}

// 依「a/b/c」路徑寫入巢狀物件，值為 null 代表刪除（和 Firebase 的 update 語意相同）
function setByPath(obj, path, value) {
  const parts = path.split("/");
  let node = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (typeof node[parts[i]] !== "object" || node[parts[i]] === null) {
      if (value === null) return;
      node[parts[i]] = {};
    }
    node = node[parts[i]];
  }
  const last = parts[parts.length - 1];
  if (value === null) delete node[last];
  else node[last] = value;
}

function createFirebaseNet(config) {
  let db = null;
  let watched = null;

  async function ready() {
    if (db) return;
    const base = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/`;
    await loadScriptOnce(base + "firebase-app-compat.js");
    await loadScriptOnce(base + "firebase-database-compat.js");
    if (!firebase.apps.length) firebase.initializeApp(config);
    db = firebase.database();
  }

  const roomRef = (code) => db.ref("rooms/" + code);

  return {
    kind: "firebase",
    async create(code, room) {
      await ready();
      const result = await roomRef(code).transaction((cur) => (cur === null ? room : undefined));
      return result.committed;
    },
    async read(code) {
      await ready();
      const snap = await roomRef(code).once("value");
      return snap.val();
    },
    async update(code, patch) {
      await ready();
      await roomRef(code).update(patch);
    },
    async watch(code, onRoom) {
      await ready();
      if (watched) watched.off();
      watched = roomRef(code);
      watched.on("value", (snap) => onRoom(snap.val()));
    },
    unwatch() {
      if (watched) watched.off();
      watched = null;
    },
    // 關掉分頁或斷線時，伺服器自動把這個玩家移出房間
    async removeOnDisconnect(code, path) {
      await ready();
      await roomRef(code).child(path).onDisconnect().remove();
    },
    cancelOnDisconnect(code, path) {
      if (db) roomRef(code).child(path).onDisconnect().cancel();
    },
  };
}

function createLocalNet() {
  const channel = "BroadcastChannel" in window ? new BroadcastChannel("space-actuary-mp") : null;
  const key = (code) => "mp-room-" + code;
  let watching = null;
  let onRoomCb = null;
  let leavePath = null;

  const read = (code) => {
    try {
      return JSON.parse(localStorage.getItem(key(code)));
    } catch (e) {
      return null;
    }
  };
  const write = (code, room) => {
    if (room) localStorage.setItem(key(code), JSON.stringify(room));
    else localStorage.removeItem(key(code));
    if (channel) channel.postMessage(code);
    if (watching === code && onRoomCb) setTimeout(() => onRoomCb(read(code)), 0);
  };
  const notify = (code) => {
    if (watching === code && onRoomCb) onRoomCb(read(code));
  };
  if (channel) channel.onmessage = (e) => notify(e.data);

  window.addEventListener("beforeunload", () => {
    if (!watching || !leavePath) return;
    const room = read(watching);
    if (!room) return;
    setByPath(room, leavePath, null);
    write(watching, room);
  });

  return {
    kind: "local",
    async create(code, room) {
      if (read(code)) return false;
      write(code, room);
      return true;
    },
    async read(code) {
      return read(code);
    },
    async update(code, patch) {
      const room = read(code);
      if (!room) return;
      Object.keys(patch).forEach((path) => setByPath(room, path, patch[path]));
      write(code, room);
    },
    async watch(code, cb) {
      watching = code;
      onRoomCb = cb;
      notify(code);
    },
    unwatch() {
      watching = null;
      onRoomCb = null;
    },
    async removeOnDisconnect(code, path) {
      leavePath = path;
    },
    cancelOnDisconnect() {
      leavePath = null;
    },
  };
}

// 沒有設定 Firebase、也不是本機測試時回傳 null：多人連線按鈕會顯示「尚未設定」
function createNet() {
  if (new URLSearchParams(location.search).get("net") === "local") return createLocalNet();
  if (typeof FIREBASE_CONFIG !== "undefined" && FIREBASE_CONFIG) return createFirebaseNet(FIREBASE_CONFIG);
  return null;
}
