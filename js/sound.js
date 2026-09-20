// 音效系統：用 Web Audio API 即時合成音效，先不需要任何音效素材檔

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

function sfxClick() {
  playTone(440, 80, "square", 0.15);
}

function sfxPass() {
  playTone(660, 150, "sine", 0.2);
}

function sfxFail() {
  playTone(140, 400, "sawtooth", 0.25);
}

function sfxLaunch() {
  playTone(220, 500, "triangle", 0.2);
}

function sfxSuccess() {
  playTone(523, 150, "sine", 0.2);
  setTimeout(() => playTone(659, 150, "sine", 0.2), 150);
  setTimeout(() => playTone(784, 250, "sine", 0.2), 300);
}

function sfxAchievement() {
  playTone(880, 200, "square", 0.15);
}
