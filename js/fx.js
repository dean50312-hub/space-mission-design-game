// 美術與點擊回饋：視差星空、點擊火花、選取卡片的卡入動畫、預算條跳動、高分彩帶
// 只負責畫面和音效，不碰任何遊戲數值；系統開啟「減少動態效果」時只畫靜態星空

const FX = (() => {
  const PIXEL = 2; // 畫布以半解析度繪製再放大，維持像素風
  const STAR_LAYERS = [
    { perArea: 0.00006, speed: 1.5, size: 1, alpha: 0.45 },
    { perArea: 0.00003, speed: 4, size: 1, alpha: 0.8 },
    { perArea: 0.00001, speed: 9, size: 2, alpha: 1 },
  ];
  const STAR_COLORS = ["#ffffff", "#cfe9ff", "#fff1c4"];
  const METEOR_MIN_GAP_MS = 7000;
  const METEOR_MAX_GAP_MS = 16000;
  const SPARK_COLORS = ["#4fd1ff", "#ffd166", "#ffffff"];
  const CONFETTI_COLORS = ["#ffd166", "#4fd1ff", "#57e389", "#ff7b54", "#ffffff"];
  const CLICKABLE = ".btn, .part-card, .seg-btn, .quiz-option, .anomaly-option, .hotspot, .rocket-summary, " +
    ".text-link-btn, .btn-link, .uplink-btn, .blueprint-detail-close, .custom-card, .codex-link";
  const SELECTABLE = ".part-card, .quiz-option, .anomaly-option, .seg-btn";

  let starCanvas, starCtx, fxCanvas, fxCtx;
  let stars = [];
  let meteor = null;
  let nextMeteorAt = 0;
  let particles = [];
  let fxRunning = false;
  let lastStarTime = 0;
  let pendingPick = null;
  const sheetMemory = new Map();

  const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (list) => list[Math.floor(Math.random() * list.length)];

  // ---------- 視差星空 ----------

  function resizeCanvas(canvas) {
    canvas.width = Math.ceil(window.innerWidth / PIXEL);
    canvas.height = Math.ceil(window.innerHeight / PIXEL);
  }

  function seedStars() {
    const w = starCanvas.width;
    const h = starCanvas.height;
    stars = [];
    STAR_LAYERS.forEach((layer) => {
      const count = Math.round(w * h * PIXEL * PIXEL * layer.perArea);
      for (let i = 0; i < count; i++) {
        stars.push({
          x: rand(0, w), y: rand(0, h), layer,
          color: pick(STAR_COLORS),
          phase: rand(0, Math.PI * 2),
          twinkle: rand(0.6, 2.2),
        });
      }
    });
  }

  function drawStars(now, dt) {
    const w = starCanvas.width;
    const h = starCanvas.height;
    const still = reduceMotion();
    starCtx.clearRect(0, 0, w, h);
    stars.forEach((s) => {
      if (!still) {
        s.x -= (s.layer.speed * dt) / 1000 / PIXEL;
        if (s.x < -2) { s.x = w + 2; s.y = rand(0, h); }
      }
      const flicker = still ? 1 : 0.65 + 0.35 * Math.sin(now / 1000 * s.twinkle + s.phase);
      starCtx.globalAlpha = s.layer.alpha * flicker;
      starCtx.fillStyle = s.color;
      starCtx.fillRect(Math.round(s.x), Math.round(s.y), s.layer.size, s.layer.size);
    });
    if (!still) drawMeteor(now, dt, w, h);
    starCtx.globalAlpha = 1;
  }

  function drawMeteor(now, dt, w, h) {
    if (!meteor && now >= nextMeteorAt) {
      meteor = { x: rand(w * 0.3, w * 1.1), y: rand(-10, h * 0.3), vx: -rand(90, 140), vy: rand(45, 70), life: 0 };
    }
    if (!meteor) return;
    meteor.life += dt;
    meteor.x += (meteor.vx * dt) / 1000;
    meteor.y += (meteor.vy * dt) / 1000;
    const TAIL = 10;
    for (let i = 0; i < TAIL; i++) {
      starCtx.globalAlpha = (1 - i / TAIL) * 0.9;
      starCtx.fillStyle = i < 2 ? "#ffffff" : "#9fdcff";
      starCtx.fillRect(Math.round(meteor.x - (meteor.vx / 60) * i * 0.25), Math.round(meteor.y - (meteor.vy / 60) * i * 0.25), 1, 1);
    }
    if (meteor.x < -20 || meteor.y > h + 20) {
      meteor = null;
      nextMeteorAt = now + rand(METEOR_MIN_GAP_MS, METEOR_MAX_GAP_MS);
    }
  }

  function starLoop(now) {
    const dt = lastStarTime ? Math.min(100, now - lastStarTime) : 0;
    lastStarTime = now;
    drawStars(now, dt);
    if (!reduceMotion()) requestAnimationFrame(starLoop);
  }

  // ---------- 粒子：點擊火花、選取光圈、彩帶 ----------

  function startFx() {
    if (fxRunning) return;
    fxRunning = true;
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(50, now - last) / 1000;
      last = now;
      fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
      particles = particles.filter((p) => {
        p.age += dt;
        if (p.age >= p.life) return false;
        p.vy += p.gravity * dt;
        p.vx *= p.drag;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.sway) p.x += Math.sin(p.age * p.sway + p.phase) * 0.6;
        fxCtx.globalAlpha = p.fade ? 1 - p.age / p.life : 1;
        fxCtx.fillStyle = p.color;
        const size = p.flutter ? Math.max(1, Math.round(p.size * Math.abs(Math.cos(p.age * p.flutter)))) : p.size;
        fxCtx.fillRect(Math.round(p.x), Math.round(p.y), p.size, size);
        return true;
      });
      fxCtx.globalAlpha = 1;
      if (particles.length) requestAnimationFrame(loop);
      else fxRunning = false;
    };
    requestAnimationFrame(loop);
  }

  function burst(clientX, clientY, count, speed) {
    if (reduceMotion() || !fxCtx) return;
    const x = clientX / PIXEL;
    const y = clientY / PIXEL;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + rand(-0.3, 0.3);
      const v = rand(speed * 0.6, speed);
      particles.push({
        x, y, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v - 10,
        gravity: 120, drag: 0.9, size: pick([1, 2, 2]),
        color: pick(SPARK_COLORS), age: 0, life: rand(0.3, 0.5), fade: true,
      });
    }
    startFx();
  }

  function confetti() {
    if (reduceMotion() || !fxCtx) return;
    const w = fxCanvas.width;
    for (let i = 0; i < 180; i++) {
      particles.push({
        x: rand(0, w), y: rand(-40, 0), vx: rand(-20, 20), vy: rand(50, 110),
        gravity: 25, drag: 0.995, size: pick([3, 4]),
        color: pick(CONFETTI_COLORS), age: 0, life: rand(3, 4.5), fade: false,
        sway: rand(2, 5), phase: rand(0, 6), flutter: rand(4, 9),
      });
    }
    startFx();
  }

  // ---------- 點擊回饋 ----------

  function cardKey(card) {
    const name = card.querySelector(".part-name");
    const img = card.querySelector("img");
    return (name ? name.textContent : card.textContent.slice(0, 30)) + "|" + (img ? img.getAttribute("src") : "");
  }

  function denied(el) {
    sfxDenied();
    if (reduceMotion()) return;
    el.classList.remove("fx-denied");
    void el.offsetWidth;
    el.classList.add("fx-denied");
  }

  function onPointerDown(e) {
    if (e.button !== 0) return;
    const el = e.target.closest(CLICKABLE);
    if (!el) return;
    if (el.disabled || el.classList.contains("unavailable")) {
      denied(el);
      return;
    }
    if (el.matches(SELECTABLE)) sfxSelect();
    else sfxClick();
    burst(e.clientX, e.clientY, 6, 70);
    pendingPick = el.matches(".part-card") ? cardKey(el) : null;
  }

  function onClick(e) {
    const el = e.target.closest(CLICKABLE);
    // 鍵盤操作（Enter／空白鍵）不會觸發 pointerdown，在這裡補上音效
    if (el && e.detail === 0 && !el.disabled) sfxClick();
    if (!pendingPick) return;
    const key = pendingPick;
    pendingPick = null;
    // 選取後畫面會整個重畫，等重畫完再找新的被選卡片
    setTimeout(() => {
      const card = [...document.querySelectorAll(".part-card.selected")].find((c) => cardKey(c) === key);
      if (!card) return;
      if (!reduceMotion()) {
        card.classList.add("fx-picked");
        card.addEventListener("animationend", () => card.classList.remove("fx-picked"), { once: true });
      }
      const r = card.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, 12, 110);
    }, 0);
  }

  // ---------- 預算表：數值改變時跳動，超標時抖動，進度條從舊長度滑到新長度 ----------

  function sheetUpdated(sheet) {
    if (!sheet) return;
    const still = reduceMotion();
    sheet.querySelectorAll(".sheet-line[data-key]").forEach((line) => {
      const key = line.dataset.key;
      const value = line.querySelector(".sheet-value");
      const fill = line.querySelector(".sheet-bar-fill");
      const now = { text: value.textContent, width: fill.style.width, bad: line.classList.contains("bad") };
      const before = sheetMemory.get(key);
      sheetMemory.set(key, now);
      if (!before || before.text === now.text || still) return;
      fill.style.transition = "none";
      fill.style.width = before.width;
      void fill.offsetWidth;
      fill.style.transition = "";
      fill.style.width = now.width;
      value.classList.add("fx-bump");
      if (now.bad) line.classList.add("fx-over");
    });
    const ev = sheet.querySelector(".sheet-ev-number");
    if (ev) {
      const before = sheetMemory.get("ev");
      sheetMemory.set("ev", ev.textContent);
      if (before !== undefined && before !== ev.textContent && !still) ev.classList.add("fx-bump");
    }
  }

  function resetSheetMemory() {
    sheetMemory.clear();
  }

  // ---------- 結果畫面 ----------

  function celebrate(grade) {
    if (grade === "S" || grade === "A") setTimeout(confetti, 350);
  }

  function init() {
    starCanvas = document.createElement("canvas");
    starCanvas.className = "fx-stars";
    fxCanvas = document.createElement("canvas");
    fxCanvas.className = "fx-particles";
    document.body.prepend(starCanvas);
    document.body.appendChild(fxCanvas);
    starCtx = starCanvas.getContext("2d");
    fxCtx = fxCanvas.getContext("2d");

    const onResize = () => {
      resizeCanvas(starCanvas);
      resizeCanvas(fxCanvas);
      seedStars();
      if (reduceMotion()) drawStars(performance.now(), 0);
    };
    window.addEventListener("resize", onResize);
    onResize();
    nextMeteorAt = performance.now() + 3000;
    requestAnimationFrame(starLoop);

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("click", onClick);
    document.addEventListener("animationend", (e) => {
      e.target.classList.remove("fx-bump", "fx-over", "fx-denied");
    });
  }

  return { init, burst, confetti, celebrate, sheetUpdated, resetSheetMemory };
})();
