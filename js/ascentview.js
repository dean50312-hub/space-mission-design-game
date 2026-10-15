// 升空畫面：用真實重力轉向軌跡的近似值驅動鏡頭、天色與大氣分層。
// 火箭固定在畫面中央、沿著軌跡的方向傾斜，世界往反方向移動。高度與水平距離用對數比例換算成畫面距離，
// 這樣發射台、雲層、平流層、卡門線都能在同一段動畫裡看到，而軌跡仍然是「先垂直、再慢慢轉平」的形狀。

// 典型低軌發射的近似值（參考 Falcon 9：約 T+1:10 突破音速、T+1:20 Max-Q、T+2:45 第一節關機時約 85 km）
// 欄位：時間 s、高度 km、水平距離 km、速度 km/s、飛行路徑角（相對水平，度）
const ASCENT_PROFILE = [
  [0, 0, 0, 0, 90],
  [10, 0.2, 0, 0.05, 90],
  [30, 2, 0.3, 0.15, 85],
  [60, 7, 2, 0.3, 75],
  [70, 9.5, 3.5, 0.34, 70],
  [80, 12, 5, 0.42, 66],
  [120, 35, 20, 1.1, 48],
  [165, 85, 70, 2.3, 30],
  [200, 110, 120, 2.5, 24],
  [300, 160, 400, 3.6, 12],
  [420, 190, 900, 5.6, 5],
  [540, 210, 1600, 7.8, 0],
];
const ASCENT_GEO_EXTRA_KMS = 2.4; // 去 GEO 時第二節要多加速，送進近地點約 10.2 km/s 的轉移軌道

// 每個發射階段：火箭一路飛到 end（真實飛行時間，秒），成功率判定在飛行途中進行，不會停下來等；ms 是動畫時間
const STAGE_FLIGHT = {
  liftoff: { end: 20, ms: 2800 },
  ascent: { end: 165, ms: 5200 },
  insertion: { end: 540, ms: 5000 },
  deployment: { end: 560, ms: 2000 },
};
const FAIRING_SEPARATION_TIME = 200;

// 大氣分層的邊界（km）
const ATMOSPHERE_BOUNDARIES = [
  { alt: 12, key: "tropopause" },
  { alt: 50, key: "stratopause" },
  { alt: 85, key: "mesopause" },
  { alt: 100, key: "karman" },
];

// 天色：空氣越稀薄，散射陽光的分子越少，天空越暗
const SKY_STOPS = [
  [0, [108, 196, 255]],
  [8, [61, 142, 224]],
  [20, [29, 79, 160]],
  [40, [16, 40, 92]],
  [70, [11, 14, 43]],
  [120, [7, 10, 28]],
];

const AscentView = (() => {
  let canvas = null;
  let ctx = null;
  let rafId = null;
  let flightTime = 0;
  let geo = false;
  let tween = null;
  let stars = [];
  let clouds = [];
  let meteors = [];
  let lastFrame = 0;
  let captionKey = null;
  const padImage = new Image();
  padImage.src = "image/ui/launchpad.png";

  // 水平方向的比例尺比較粗：起飛初期幾乎不往前飛，畫面上的軌跡才會先垂直、再轉平
  const SCALE_PX = 260;
  const SCALE_KM = 0.3;
  const SCALE_DOWN_KM = 4;
  const toScreenDistance = (km) => SCALE_PX * Math.log(1 + Math.max(0, km) / SCALE_KM);
  const toScreenDownrange = (km) => SCALE_PX * Math.log(1 + Math.max(0, km) / SCALE_DOWN_KM);

  function seeded(seed) {
    let s = seed;
    return () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  function lerp(a, b, f) {
    return a + (b - a) * f;
  }

  function profileAt(t) {
    const p = ASCENT_PROFILE;
    if (t <= p[0][0]) return { alt: 0, down: 0, v: 0, angle: 90 };
    let i = 1;
    while (i < p.length - 1 && p[i][0] < t) i++;
    const a = p[i - 1];
    const b = p[i];
    const f = Math.max(0, Math.min(1, (t - a[0]) / (b[0] - a[0])));
    let v = lerp(a[3], b[3], f);
    if (geo && t > 165) v += (Math.min(t, 540) - 165) / (540 - 165) * ASCENT_GEO_EXTRA_KMS;
    return { alt: lerp(a[1], b[1], f), down: lerp(a[2], b[2], f), v, angle: lerp(a[4], b[4], f) };
  }

  function skyColor(alt) {
    for (let i = 1; i < SKY_STOPS.length; i++) {
      const [a1, c1] = SKY_STOPS[i - 1];
      const [a2, c2] = SKY_STOPS[i];
      if (alt <= a2) {
        const f = Math.max(0, (alt - a1) / (a2 - a1));
        return c1.map((c, k) => Math.round(lerp(c, c2[k], f)));
      }
    }
    return SKY_STOPS[SKY_STOPS.length - 1][1];
  }

  // 畫面上某個高度、某段水平距離的位置（以火箭噴嘴為基準）
  function makeProjector(state, ref) {
    const ay = toScreenDistance(state.alt);
    const dx = toScreenDownrange(state.down);
    return {
      x: (down) => ref.x - (dx - toScreenDownrange(down)),
      y: (alt) => ref.y + (ay - toScreenDistance(alt)),
      altAt: (y) => SCALE_KM * (Math.exp(Math.max(0, ay + (ref.y - y)) / SCALE_PX) - 1),
    };
  }

  // 火箭的傾斜角就是真實的飛行路徑角：90° 垂直、0° 水平
  function headingAt(t) {
    return ((90 - profileAt(t).angle) * Math.PI) / 180;
  }

  function resize() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    const rand = seeded(20261115);
    stars = Array.from({ length: 90 }, () => ({
      x: rand() * canvas.width,
      y: rand() * canvas.height,
      s: rand() < 0.2 ? 2 : 1,
    }));
    clouds = Array.from({ length: 9 }, () => ({ alt: 1.5 + rand() * 7, down: -6 + rand() * 14, w: 40 + Math.round(rand() * 4) * 8 }));
  }

  function drawCloud(x, y, w) {
    ctx.fillStyle = "rgba(200, 220, 240, 0.9)";
    ctx.fillRect(x, y + 4, w, 12);
    ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
    ctx.fillRect(x, y, w, 12);
    ctx.fillRect(x + 8, y - 8, w - 16, 8);
    ctx.fillRect(x + w / 2 - 8, y - 14, 16, 6);
  }

  function drawGround(proj) {
    const surface = proj.y(0);
    if (surface - 124 > canvas.height) return;
    const left = proj.x(0) - 360;
    const top = surface - 124; // 發射台圖片的台面在第 62 列，放大 2 倍
    ctx.fillStyle = "#3e843e";
    ctx.fillRect(0, surface - 20, canvas.width, 200);
    if (padImage.complete) ctx.drawImage(padImage, Math.round(left), Math.round(top), 720, 180);
    // 發射場幾乎都在海邊：草地、沙灘、海
    ctx.fillStyle = "#3e843e";
    ctx.fillRect(0, top + 180, canvas.width, 30);
    ctx.fillStyle = "#d9c48a";
    ctx.fillRect(0, top + 210, canvas.width, 16);
    ctx.fillStyle = "#2f78bf";
    ctx.fillRect(0, top + 226, canvas.width, canvas.height);
  }

  function drawBoundaries(proj) {
    ctx.font = "11px 'Cubic 11', monospace";
    ctx.textBaseline = "bottom";
    ATMOSPHERE_BOUNDARIES.forEach(({ alt, key }) => {
      const y = Math.round(proj.y(alt));
      if (y < -10 || y > canvas.height + 10) return;
      ctx.strokeStyle = key === "karman" ? "rgba(255, 209, 102, 0.7)" : "rgba(184, 240, 255, 0.35)";
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(canvas.width, y + 0.5);
      ctx.stroke();
      ctx.setLineDash([]);
      if (y < 56) return; // 太靠上會被右上角的高度計擋住
      const label = t("simulation.ascent.boundary_" + key);
      const w = ctx.measureText(label).width + 8;
      ctx.fillStyle = "rgba(7, 10, 36, 0.6)";
      ctx.fillRect(8, y - 16, w, 15);
      ctx.fillStyle = key === "karman" ? "#ffd166" : "#e8ecff";
      ctx.fillText(label, 12, y - 3);
    });
  }

  // 50 km 以上看得到地球的弧線；接近 100 km 時地平線上出現一層淡綠色的氣輝
  function drawLimb(state) {
    if (state.alt < 30) return;
    const rise = Math.min(1, (state.alt - 30) / 170) * canvas.height * 0.28;
    const r = canvas.width * 2.2;
    const cx = canvas.width * 0.5;
    const cy = canvas.height + r - rise;
    ctx.fillStyle = "#1f5fae";
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(120, 190, 255, 0.55)";
    ctx.beginPath();
    ctx.arc(cx, cy, r + 3, Math.PI, 2 * Math.PI);
    ctx.stroke();
    if (state.alt > 80) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = `rgba(120, 255, 160, ${Math.min(0.6, (state.alt - 80) / 40)})`;
      ctx.beginPath();
      ctx.arc(cx, cy, r + 9, Math.PI, 2 * Math.PI);
      ctx.stroke();
    }
    ctx.lineWidth = 1;
  }

  function drawMeteors(state, dt) {
    if (state.alt > 50 && state.alt < 110 && Math.random() < dt * 6) {
      meteors.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height * 0.6, life: 0.5 });
    }
    meteors = meteors.filter((m) => (m.life -= dt) > 0);
    meteors.forEach((m) => {
      const a = m.life / 0.5;
      ctx.strokeStyle = `rgba(255, 241, 184, ${a})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(m.x - 14, m.y - 8);
      ctx.stroke();
      m.x += 60 * dt;
      m.y += 34 * dt;
    });
    ctx.lineWidth = 1;
  }

  function drawTrail(state, ref, nozzle) {
    const proj = makeProjector(state, ref);
    ctx.strokeStyle = "rgba(255, 241, 184, 0.75)";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    for (let tt = 0; tt <= flightTime; tt += 2) {
      const p = profileAt(tt);
      const x = proj.x(p.down);
      const y = proj.y(p.alt);
      if (tt === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineTo(nozzle.x, nozzle.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = 1;
  }

  // 突破音速時，箭體周圍的水氣瞬間凝結成一圈白色雲錐
  function drawVaporCone(heading, center) {
    if (flightTime < 62 || flightTime > 80) return;
    const a = Math.sin(((flightTime - 62) / 18) * Math.PI) * 0.7;
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.rotate(heading);
    ctx.fillStyle = `rgba(255, 255, 255, ${a})`;
    ctx.beginPath();
    ctx.ellipse(0, -6, 30, 9, 0, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
  }

  function rocketGeometry() {
    const wrap = document.getElementById("rocket-wrap");
    const img = document.getElementById("rocket-img");
    const track = canvas.getBoundingClientRect();
    const cx = track.width / 2;
    const cy = track.height / 2;
    // 火箭圖固定 96 px 高，在 rocket-wrap 的最上方；以 rocket-wrap 中心為旋轉軸
    const wrapHeight = wrap.offsetHeight || 138;
    const bottomOffset = -wrapHeight / 2 + (img.offsetHeight || 96);
    return { cx, cy, bottomOffset };
  }

  function updateHud(state) {
    const hud = document.getElementById("ascent-hud");
    hud.innerHTML = `${t("simulation.ascent.hud", {
      alt: fmtNum(state.alt, state.alt < 10 ? 1 : 0),
      v: fmtNum(state.v, 1),
      angle: fmtNum(state.angle),
    })}<span class="ascent-hud-note">${t("simulation.ascent.hudNote")}</span>`;

    let key;
    if (flightTime < 62) key = "troposphere";
    else if (flightTime < 78) key = "sonic";
    else if (flightTime < 92) key = "maxq";
    else if (state.alt < 50) key = "stratosphere";
    else if (state.alt < 85) key = "mesosphere";
    else if (flightTime < 300) key = "thermosphere";
    else key = geo ? "orbitSpeedGeo" : "orbitSpeed";
    if (key !== captionKey) {
      captionKey = key;
      document.getElementById("ascent-caption").textContent = t("simulation.ascent.caption_" + key);
    }

    // 尾焰：低空看得到馬赫鑽石；越高外面氣壓越低，尾焰膨脹得越大
    const exhaust = document.getElementById("exhaust");
    exhaust.classList.toggle("diamonds", state.alt < 15);
    exhaust.style.setProperty("--plume", (1 + Math.min(1.4, Math.max(0, (state.alt - 15) / 45))).toFixed(2));
  }

  function draw(now) {
    const dt = lastFrame ? Math.min(0.1, (now - lastFrame) / 1000) : 0;
    lastFrame = now;
    if (tween) {
      const f = Math.min(1, (now - tween.start) / tween.ms);
      const eased = tween.linear ? f : f * f * (3 - 2 * f);
      flightTime = lerp(tween.from, tween.to, eased);
      if (f >= 1) {
        const done = tween.resolve;
        tween = null;
        done();
      }
    }

    const state = profileAt(flightTime);
    const geom = rocketGeometry();
    const heading = headingAt(flightTime);
    const ref = { x: geom.cx - geom.bottomOffset * Math.sin(heading), y: geom.cy + geom.bottomOffset * Math.cos(heading) };
    const proj = makeProjector(state, ref);

    const top = skyColor(proj.altAt(0));
    const bottom = skyColor(proj.altAt(canvas.height));
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, `rgb(${top.join(",")})`);
    grad.addColorStop(1, `rgb(${bottom.join(",")})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const starAlpha = Math.max(0, Math.min(1, (state.alt - 25) / 35));
    if (starAlpha > 0) {
      ctx.fillStyle = `rgba(232, 236, 255, ${starAlpha})`;
      stars.forEach((s) => ctx.fillRect(s.x, s.y, s.s, s.s));
    }

    drawLimb(state);
    drawMeteors(state, dt);
    drawBoundaries(proj);
    clouds.forEach((c) => {
      const x = proj.x(c.down) - c.w / 2;
      const y = proj.y(c.alt);
      if (y > -30 && y < canvas.height + 30) drawCloud(Math.round(x), Math.round(y), c.w);
    });
    drawGround(proj);
    // 分離後剩下的那一節比較短，軌跡要接到它的噴嘴
    const cut = typeof rocketClip !== "undefined" ? (rocketClip.bottom / 100) * 96 : 0;
    const nozzle = { x: ref.x + cut * Math.sin(heading), y: ref.y - cut * Math.cos(heading) };
    drawTrail(state, ref, nozzle);
    drawVaporCone(heading, { x: geom.cx, y: geom.cy - 10 });

    document.getElementById("rocket-wrap").style.transform = `translate(-50%, -50%) rotate(${heading}rad)`;
    updateHud(state);
    rafId = requestAnimationFrame(draw);
  }

  function start(canvasEl, orbitId) {
    stop();
    canvas = canvasEl;
    ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    geo = orbitId === "geo";
    flightTime = 0;
    meteors = [];
    captionKey = null;
    lastFrame = 0;
    resize();
    rafId = requestAnimationFrame(draw);
  }

  function stop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    if (tween) tween.resolve();
    tween = null;
    const wrap = document.getElementById("rocket-wrap");
    if (wrap) wrap.style.transform = "";
  }

  // 把飛行時間推進到 target 秒，動畫結束時 resolve；linear 用在連續飛行，階段之間不會減速
  function flyTo(target, ms, linear = false) {
    return new Promise((resolve) => {
      if (tween) tween.resolve();
      const own = { from: flightTime, to: target, ms: Math.max(1, ms), start: performance.now(), resolve, linear };
      tween = own;
      // 分頁在背景時瀏覽器會暫停 requestAnimationFrame，用計時器保證飛行一定會結束，模擬不會卡住
      setTimeout(() => {
        if (tween !== own) return;
        flightTime = target;
        tween = null;
        resolve();
      }, own.ms + 150);
      if (!rafId) {
        flightTime = target;
        tween = null;
        resolve();
      }
    });
  }

  window.addEventListener("resize", () => {
    if (canvas && rafId) resize();
  });

  // 失敗時停在當下的位置（爆炸就發生在這裡）
  function freeze() {
    if (tween) tween.resolve();
    tween = null;
  }

  return { start, stop, flyTo, freeze };
})();
