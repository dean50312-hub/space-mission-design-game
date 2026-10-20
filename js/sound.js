// 音效系統：音效用 Web Audio API 即時合成；背景音樂是胡宥彥原創的三首曲子（audio/bgm/）

let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function playTone(freq, durationMs, type, startGain) {
  const settings = storageGetSettings();
  if (!settings.soundOn) return;

  const ctx = getAudioCtx();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || "sine";
    osc.frequency.value = freq;
    gain.gain.value = (startGain || 0.2) * settings.volume;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
    osc.stop(ctx.currentTime + durationMs / 1000);
  } catch (e) {
    // Web Audio 不可用時靜默忽略
  }
}

// 滑音：頻率從 fromHz 滑到 toHz，8-bit 遊戲常見的「咻」聲
function playSweep(fromHz, toHz, durationMs, type, startGain) {
  const settings = storageGetSettings();
  if (!settings.soundOn) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const end = ctx.currentTime + durationMs / 1000;
    osc.type = type || "square";
    osc.frequency.setValueAtTime(fromHz, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(toHz, end);
    gain.gain.value = (startGain || 0.2) * settings.volume;
    gain.gain.exponentialRampToValueAtTime(0.001, end);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(end);
  } catch (e) {
    // Web Audio 不可用時靜默忽略
  }
}

// 琶音：一串音符依序彈出
function playNotes(freqs, stepMs, noteMs, type, startGain) {
  freqs.forEach((f, i) => setTimeout(() => playTone(f, noteMs, type, startGain), i * stepMs));
}

// 一次點擊可能同時觸發全域回饋和個別按鈕的音效，短時間內只響一次
const CLICK_SFX_GAP_MS = 80;
let lastClickSfxAt = 0;

function clickSfxAllowed() {
  const now = performance.now();
  if (now - lastClickSfxAt < CLICK_SFX_GAP_MS) return false;
  lastClickSfxAt = now;
  return true;
}

function sfxClick() {
  if (clickSfxAllowed()) playSweep(620, 900, 60, "square", 0.08);
}

// 選取零件、答案等「做出選擇」的動作
function sfxSelect() {
  if (clickSfxAllowed()) playNotes([523, 784], 55, 70, "square", 0.08);
}

// 按到不能選的選項（例如事件下停用的零件）
function sfxDenied() {
  if (clickSfxAllowed()) playNotes([196, 165], 90, 110, "square", 0.1);
}

function sfxPass() {
  playNotes([660, 880], 70, 110, "triangle", 0.2);
}

function sfxFail() {
  playSweep(320, 70, 520, "sawtooth", 0.22);
}

function sfxLaunch() {
  playSweep(110, 440, 650, "triangle", 0.22);
}

function sfxSuccess() {
  playNotes([523, 659, 784, 1047], 110, 160, "square", 0.12);
  setTimeout(() => {
    playTone(523, 450, "triangle", 0.12);
    playTone(659, 450, "triangle", 0.12);
    playTone(784, 450, "triangle", 0.12);
  }, 460);
}

function sfxAchievement() {
  playNotes([880, 1175, 1568, 1760], 70, 120, "square", 0.08);
}

// ---------- 背景音樂 ----------
// 每首都是 16 小節＋殘響尾音。下一輪在第 16 小節結束時開始，
// 讓上一輪的尾音疊在新一輪開頭底下，形成無縫循環。
const BGM_TRACKS = {
  space: { src: "audio/bgm/space.mp3", bpm: 65 },   // 宇宙氛圍：首頁、結果、運作期軌道畫面
  lab: { src: "audio/bgm/lab.mp3", bpm: 90 },       // 實驗室：任務簡報、設計衛星
  launch: { src: "audio/bgm/launch.mp3", bpm: 120 }, // 發射階段
};
const BGM_BARS = 16;
const BGM_BEATS_PER_BAR = 4;
const BGM_GAIN = 0.35; // 相對於音效的音量
const BGM_FADE_SEC = 1.2;
const BGM_SCHEDULE_AHEAD_SEC = 2;

const bgmBuffers = {};
let bgmWanted = null;
let bgmCurrent = null;
let audioUnlocked = false;

function bgmLoopSec(id) {
  return (BGM_BARS * BGM_BEATS_PER_BAR * 60) / BGM_TRACKS[id].bpm;
}

function bgmTargetGain() {
  return BGM_GAIN * storageGetSettings().volume;
}

function loadBgm(ctx, id) {
  if (!bgmBuffers[id]) {
    bgmBuffers[id] = fetch(BGM_TRACKS[id].src)
      .then((r) => r.arrayBuffer())
      .then((data) => ctx.decodeAudioData(data))
      .catch(() => {
        delete bgmBuffers[id];
        return null;
      });
  }
  return bgmBuffers[id];
}

function scheduleBgm(entry) {
  const ctx = audioCtx;
  while (entry.nextStart < ctx.currentTime + BGM_SCHEDULE_AHEAD_SEC) {
    const src = ctx.createBufferSource();
    src.buffer = entry.buffer;
    src.connect(entry.gain);
    src.start(Math.max(entry.nextStart, ctx.currentTime));
    entry.sources.add(src);
    src.onended = () => entry.sources.delete(src);
    entry.nextStart += entry.loopSec;
  }
}

function fadeOutBgm(entry) {
  if (!entry) return;
  const now = audioCtx.currentTime;
  clearInterval(entry.timer);
  entry.gain.gain.cancelScheduledValues(now);
  entry.gain.gain.setValueAtTime(entry.gain.gain.value, now);
  entry.gain.gain.linearRampToValueAtTime(0, now + BGM_FADE_SEC);
  entry.sources.forEach((src) => src.stop(now + BGM_FADE_SEC));
}

// 切換背景音樂；同一首已在播放時不會重頭開始
function playBgm(id) {
  bgmWanted = id;
  syncBgm();
}

function syncBgm() {
  if (!audioUnlocked) return; // 瀏覽器要求使用者先互動才能出聲，解鎖後會補播
  const ctx = getAudioCtx();
  if (!ctx) return;

  const id = storageGetSettings().soundOn ? bgmWanted : null;
  if (bgmCurrent && bgmCurrent.id === id) return;
  fadeOutBgm(bgmCurrent);
  bgmCurrent = null;
  if (!id) return;

  const entry = { id, gain: ctx.createGain(), sources: new Set(), timer: null };
  bgmCurrent = entry;
  entry.gain.gain.value = 0;
  entry.gain.connect(ctx.destination);

  loadBgm(ctx, id).then((buffer) => {
    if (!buffer || bgmCurrent !== entry) return;
    const now = ctx.currentTime;
    entry.buffer = buffer;
    entry.loopSec = Math.min(bgmLoopSec(id), buffer.duration);
    entry.nextStart = now;
    entry.gain.gain.setValueAtTime(0, now);
    entry.gain.gain.linearRampToValueAtTime(bgmTargetGain(), now + BGM_FADE_SEC);
    scheduleBgm(entry);
    entry.timer = setInterval(() => scheduleBgm(entry), 500);
  });
}

// 設定畫面調整音量或開關音效時呼叫
function updateBgmVolume() {
  if (!audioUnlocked) return;
  if (!bgmCurrent || !bgmCurrent.buffer || !storageGetSettings().soundOn) {
    syncBgm();
    return;
  }
  const now = audioCtx.currentTime;
  bgmCurrent.gain.gain.cancelScheduledValues(now);
  bgmCurrent.gain.gain.setTargetAtTime(bgmTargetGain(), now, 0.05);
}

function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  document.removeEventListener("pointerdown", unlockAudio);
  document.removeEventListener("keydown", unlockAudio);
  syncBgm();
}

document.addEventListener("pointerdown", unlockAudio);
document.addEventListener("keydown", unlockAudio);

// 切到其他分頁時暫停，回來再繼續
document.addEventListener("visibilitychange", () => {
  if (!audioCtx || !audioUnlocked) return;
  if (document.hidden) audioCtx.suspend();
  else audioCtx.resume();
});
