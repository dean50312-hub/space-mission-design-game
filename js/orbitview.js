// 運作期軌道畫面：從北極上空俯視地球（比例正確），衛星繞行、地面站跟著地球自轉，
// 只有在地面站「看得到」衛星時（地平線條件 cosθ > R⊕/r）才畫出資料下傳光束。

const EARTH_RADIUS_KM = 6371;
const EARTH_SPIN_VISUAL_SECONDS = 20; // 畫面上地球自轉一圈的秒數（衛星週期依真實比例換算）
const SIDEREAL_DAY_MIN = 1436;
const GROUND_STATION_LONGITUDE = 0.6;

const OrbitView = (() => {
  let canvas = null;
  let ctx = null;
  let rafId = null;
  let config = null;
  let startTime = 0;
  let satState = "ok";
  let earthTexture = null;
  let earthLowRes = null;

  function hash(x, y) {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  function smoothNoise(x, y) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi);
    const b = hash(xi + 1, yi);
    const c = hash(xi, yi + 1);
    const d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  // 經緯度材質：海洋、陸地、北極冰帽（程式生成，不代表真實海岸線）
  function buildEarthTexture() {
    const W = 128;
    const H = 64;
    const tex = new Array(W * H);
    for (let y = 0; y < H; y++) {
      const lat = 90 - (y / H) * 180;
      for (let x = 0; x < W; x++) {
        const n =
          smoothNoise(x / 16, y / 16) * 0.6 + smoothNoise(x / 6, y / 6) * 0.3 + smoothNoise(x / 3, y / 3) * 0.1;
        let color;
        if (lat > 75 || lat < -75) color = [230, 240, 250];
        else if (n > 0.64) color = n > 0.74 ? [150, 140, 90] : [70, 140, 70];
        else color = n > 0.58 ? [40, 110, 190] : [25, 75, 160];
        tex[y * W + x] = color;
      }
    }
    return { W, H, tex };
  }

  function drawEarth(rotation) {
    const res = config.earthRes;
    const img = earthLowRes.createImageData(res * 2, res * 2);
    const { W, H, tex } = earthTexture;
    for (let py = 0; py < res * 2; py++) {
      for (let px = 0; px < res * 2; px++) {
        const dx = (px + 0.5 - res) / res;
        const dy = (py + 0.5 - res) / res;
        const rho = Math.sqrt(dx * dx + dy * dy);
        if (rho > 1) continue;
        // 北極俯視的正射投影：離中心的距離 = cos(緯度)
        const lat = (Math.acos(Math.min(1, rho)) * 180) / Math.PI;
        const lon = Math.atan2(dy, dx) - rotation;
        const tx = Math.floor((((lon / (2 * Math.PI)) % 1) + 1) % 1 * W);
        const ty = Math.min(H - 1, Math.floor(((90 - lat) / 180) * H));
        const base = tex[ty * W + tx];
        // 太陽從畫面左側照過來：右半邊是夜晚
        const light = dx < 0 ? 1 : Math.max(0.28, 1 - dx * 1.6);
        const i = (py * res * 2 + px) * 4;
        img.data[i] = base[0] * light;
        img.data[i + 1] = base[1] * light;
        img.data[i + 2] = base[2] * light;
        img.data[i + 3] = 255;
      }
    }
    earthLowRes.putImageData(img, 0, 0);
    const size = config.earthRadiusPx * 2;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(earthLowRes.canvas, 0, 0, res * 2, res * 2, config.cx - size / 2, config.cy - size / 2, size, size);
  }

  function drawSatellite(x, y, angle, t) {
    const blink = satState === "anomaly" && Math.floor(t * 6) % 2 === 0;
    const body = satState === "dead" ? "#6b6f7a" : blink ? "#ff5566" : "#e8ecff";
    const panel = satState === "dead" ? "#4a4d57" : "#4f7fd1";
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.rotate(angle);
    ctx.fillStyle = panel;
    ctx.fillRect(-3, -13, 6, 8);
    ctx.fillRect(-3, 5, 6, 8);
    ctx.fillStyle = body;
    ctx.fillRect(-4, -4, 8, 8);
    ctx.restore();
  }

  function frame(now) {
    const t = (now - startTime) / 1000;
    const { cx, cy, orbitRadiusPx, earthRadiusPx, satPeriod, horizonCos } = config;

    ctx.fillStyle = "#070a24";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (const s of config.stars) {
      ctx.fillStyle = `rgba(255,255,255,${s.a})`;
      ctx.fillRect(s.x, s.y, 1, 1);
    }

    ctx.strokeStyle = "rgba(79, 209, 255, 0.25)";
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.arc(cx, cy, orbitRadiusPx, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.setLineDash([]);

    // 從北極上空看，地球與衛星都是逆時針轉（畫布 y 軸朝下，所以角度取負）
    const earthRotation = -(2 * Math.PI * t) / EARTH_SPIN_VISUAL_SECONDS;
    drawEarth(earthRotation);

    const stationAngle = earthRotation + GROUND_STATION_LONGITUDE;
    const sx = cx + Math.cos(stationAngle) * earthRadiusPx;
    const sy = cy + Math.sin(stationAngle) * earthRadiusPx;

    const satAngle = satState === "dead" && config.deadAngle !== null
      ? config.deadAngle
      : -(2 * Math.PI * t) / satPeriod + config.phase;
    if (satState === "dead" && config.deadAngle === null) config.deadAngle = satAngle;
    const satX = cx + Math.cos(satAngle) * orbitRadiusPx;
    const satY = cy + Math.sin(satAngle) * orbitRadiusPx;

    const visible = Math.cos(satAngle - stationAngle) > horizonCos;
    if (visible && satState !== "dead") {
      ctx.strokeStyle = "rgba(87, 227, 137, 0.85)";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.lineDashOffset = -t * 30;
      ctx.beginPath();
      ctx.moveTo(satX, satY);
      ctx.lineTo(sx, sy);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineWidth = 1;
    }

    ctx.fillStyle = visible && satState !== "dead" ? "#57e389" : "#ffd166";
    ctx.fillRect(Math.round(sx) - 3, Math.round(sy) - 3, 6, 6);

    drawSatellite(satX, satY, satAngle, t);
    config.onVisibility(visible && satState !== "dead");

    rafId = requestAnimationFrame(frame);
  }

  function start(canvasEl, orbit, onVisibility) {
    stop();
    canvas = canvasEl;
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    ctx = canvas.getContext("2d");
    if (!earthTexture) earthTexture = buildEarthTexture();

    const orbitRadiusKm = EARTH_RADIUS_KM + orbit.altitudeKm;
    const ratio = orbitRadiusKm / EARTH_RADIUS_KM;
    const orbitRadiusPx = Math.min(canvas.width, canvas.height) * 0.4;
    const earthRadiusPx = orbitRadiusPx / ratio;
    const periodMin = 2 * Math.PI * Math.sqrt(Math.pow(orbitRadiusKm, 3) / 398600.4418) / 60;

    earthLowRes = document.createElement("canvas").getContext("2d");
    const earthRes = Math.max(10, Math.min(48, Math.round(earthRadiusPx / 3)));
    earthLowRes.canvas.width = earthRes * 2;
    earthLowRes.canvas.height = earthRes * 2;

    const stars = [];
    for (let i = 0; i < 90; i++) {
      stars.push({ x: Math.floor(hash(i, 1) * canvas.width), y: Math.floor(hash(i, 2) * canvas.height), a: 0.3 + hash(i, 3) * 0.6 });
    }

    config = {
      cx: canvas.width / 2,
      cy: canvas.height / 2 + 22,
      orbitRadiusPx,
      earthRadiusPx,
      earthRes,
      satPeriod: (EARTH_SPIN_VISUAL_SECONDS * periodMin) / SIDEREAL_DAY_MIN,
      horizonCos: 1 / ratio,
      phase: GROUND_STATION_LONGITUDE - 0.4,
      stars,
      deadAngle: null,
      onVisibility: onVisibility || (() => {}),
      periodMin,
    };
    satState = "ok";
    startTime = performance.now();
    rafId = requestAnimationFrame(frame);
    return { periodMin, ratio };
  }

  function stop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  function setState(state) {
    satState = state;
  }

  return { start, stop, setState };
})();
