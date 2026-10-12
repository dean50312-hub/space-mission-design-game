// 運作期軌道畫面：從北極正上方俯視地球（正射投影、比例正確），用真實的 3D 幾何計算衛星位置。
// LEO 走太陽同步軌道（傾角約 98°，幾乎通過南北極），GEO 定點在地面站經度的赤道上空。
// 地面站在新竹（國家太空中心），只有衛星在地面站地平線以上時（仰角 > 0）才畫出資料下傳光束。
// 慣性座標：Z 軸指向北極、觀看者在 +Z；太陽在畫面左方（−X），所以右半邊是夜晚。

const EARTH_RADIUS_KM = 6371;
const EARTH_SPIN_VISUAL_SECONDS = 20; // 畫面上地球自轉一圈的秒數（衛星週期依真實比例換算）
const SIDEREAL_DAY_MIN = 1436;
const GROUND_STATION = { latDeg: 24.8, lonDeg: 121.0 }; // 新竹
const SSO_INCLINATION_DEG = 97.6; // 550 km 太陽同步軌道
const SSO_DESCENDING_NODE_LOCAL_HOUR = 10.5; // 上午 10:30 降交點，地球觀測衛星常用（陰影長度適中）
const STATUS_HOLD_SECONDS = 0.6;
const VISIBILITY_SUBSTEP_SECONDS = 0.02; // 通訊窗口很短，狀態文字多停留一下才看得清楚（光束本身不延長）

const EARTH_COLORS = {
  ocean: [25, 75, 160],
  land: [70, 130, 70],
  tundra: [112, 120, 82],
  desert: [190, 165, 110],
  glacier: [236, 242, 250],
  seaIce: [205, 222, 240],
};

const OrbitView = (() => {
  let canvas = null;
  let ctx = null;
  let rafId = null;
  let config = null;
  let startTime = 0;
  let satState = "ok";
  let earthColors = null;
  let earthLowRes = null;

  const DEG = Math.PI / 180;

  function hash(x, y) {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  // 解開 js/earthmap.js 的 run-length 編碼，並依地區上色（高緯苔原、撒哈拉與阿拉伯沙漠）
  function buildEarthColors() {
    const { W, H, rows } = EARTH_MAP;
    const colors = new Array(W * H);
    rows.forEach((row, y) => {
      let x = 0;
      row.split(",").forEach((token) => {
        const kind = Number(token[0]);
        const run = parseInt(token.slice(1), 36);
        for (let i = 0; i < run; i++, x++) {
          const lat = 90 - ((y + 0.5) * 90) / H;
          const lon = -180 + ((x + 0.5) * 360) / W;
          let c;
          if (kind === 0) c = EARTH_COLORS.ocean;
          else if (kind === 2) c = EARTH_COLORS.glacier;
          else if (kind === 3) c = EARTH_COLORS.seaIce;
          else if (lat > 60) c = EARTH_COLORS.tundra;
          else if ((lat > 15 && lat < 35 && lon > -17 && lon < 60) || (lat > 35 && lat < 45 && lon > 50 && lon < 75)) c = EARTH_COLORS.desert;
          else c = EARTH_COLORS.land;
          const jitter = 0.94 + hash(x, y) * 0.12;
          colors[y * W + x] = c.map((v) => Math.min(255, v * jitter));
        }
      });
    });
    return colors;
  }

  function earthRotation(t) {
    return (2 * Math.PI * t) / EARTH_SPIN_VISUAL_SECONDS + config.earthPhase;
  }

  // 地表一點（緯度、經度）在慣性座標中的單位向量
  function surfacePoint(latDeg, lonDeg, rotation) {
    const a = lonDeg * DEG + rotation;
    const c = Math.cos(latDeg * DEG);
    return [c * Math.cos(a), c * Math.sin(a), Math.sin(latDeg * DEG)];
  }

  // 衛星位置（單位：地球半徑）
  function satellitePosition(t, rotation) {
    const r = config.ratio;
    if (config.geo) {
      const a = GROUND_STATION.lonDeg * DEG + rotation;
      return [r * Math.cos(a), r * Math.sin(a), 0];
    }
    const u = (2 * Math.PI * t) / config.satPeriod + config.satPhase;
    return orbitPoint(u);
  }

  function orbitPoint(u) {
    const r = config.ratio;
    const { cosO, sinO, cosI, sinI } = config.plane;
    return [
      r * (cosO * Math.cos(u) - sinO * Math.sin(u) * cosI),
      r * (sinO * Math.cos(u) + cosO * Math.sin(u) * cosI),
      r * Math.sin(u) * sinI,
    ];
  }

  function toScreen(p) {
    return [config.cx + p[0] * config.earthRadiusPx, config.cy - p[1] * config.earthRadiusPx];
  }

  // 在地球背後（南半球那一側、而且投影落在地球圓盤內）就被地球擋住
  function hiddenBehindEarth(p) {
    return p[2] < 0 && p[0] * p[0] + p[1] * p[1] < 1;
  }

  // 仰角 > 0：衛星在地面站的地平線以上（向量 (衛星 − 地面站) 與地面站向上方向的夾角小於 90°）
  function stationSees(sat, station) {
    return sat[0] * station[0] + sat[1] * station[1] + sat[2] * station[2] > 1;
  }

  function visibleAt(time) {
    const rotation = earthRotation(time);
    const station = surfacePoint(GROUND_STATION.latDeg, GROUND_STATION.lonDeg, rotation);
    return stationSees(satellitePosition(time, rotation), station);
  }

  function drawEarth(rotation) {
    const res = config.earthRes;
    const img = earthLowRes.createImageData(res * 2, res * 2);
    const { W, H } = EARTH_MAP;
    for (let py = 0; py < res * 2; py++) {
      for (let px = 0; px < res * 2; px++) {
        const X = (px + 0.5 - res) / res;
        const Y = -(py + 0.5 - res) / res;
        const rho = Math.sqrt(X * X + Y * Y);
        if (rho > 1) continue;
        // 北極俯視的正射投影：離中心的距離 = cos(緯度)
        const lat = Math.acos(rho) / DEG;
        let lon = (Math.atan2(Y, X) - rotation) / DEG;
        lon = ((((lon + 180) % 360) + 360) % 360) - 180;
        const tx = Math.min(W - 1, Math.floor(((lon + 180) / 360) * W));
        const ty = Math.min(H - 1, Math.floor(((90 - lat) / 90) * H));
        const base = earthColors[ty * W + tx];
        const light = X < 0 ? 1 : Math.max(0.28, 1 - X * 1.6);
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

  function drawOrbitPath(frontOnly) {
    ctx.strokeStyle = frontOnly ? "rgba(79, 209, 255, 0.35)" : "rgba(79, 209, 255, 0.18)";
    ctx.setLineDash([3, 5]);
    if (config.geo) {
      if (!frontOnly) {
        ctx.beginPath();
        ctx.arc(config.cx, config.cy, config.ratio * config.earthRadiusPx, 0, 2 * Math.PI);
        ctx.stroke();
      }
    } else {
      ctx.beginPath();
      let drawing = false;
      for (let k = 0; k <= 180; k++) {
        const p = orbitPoint((k / 180) * 2 * Math.PI);
        const show = !frontOnly || !hiddenBehindEarth(p);
        const [x, y] = toScreen(p);
        if (show && drawing) ctx.lineTo(x, y);
        else if (show) ctx.moveTo(x, y);
        drawing = show;
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  function drawSatellite(x, y, angle, t, alpha) {
    const blink = satState === "anomaly" && Math.floor(t * 6) % 2 === 0;
    const body = satState === "dead" ? "#6b6f7a" : blink ? "#ff5566" : "#e8ecff";
    const panel = satState === "dead" ? "#4a4d57" : "#4f7fd1";
    ctx.save();
    ctx.globalAlpha = alpha;
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
    if (satState === "dead" && config.deadT === null) config.deadT = t;
    const satT = config.deadT !== null ? config.deadT : t;

    ctx.fillStyle = "#070a24";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (const s of config.stars) {
      ctx.fillStyle = `rgba(255,255,255,${s.a})`;
      ctx.fillRect(s.x, s.y, 1, 1);
    }

    const rotation = earthRotation(t);
    const sat = satellitePosition(satT, config.geo && config.deadT !== null ? earthRotation(config.deadT) : rotation);
    const satNext = satellitePosition(satT + 0.01, earthRotation(satT + 0.01));
    const [satX, satY] = toScreen(sat);
    const [nextX, nextY] = toScreen(satNext);
    const heading = Math.atan2(nextY - satY, nextX - satX) + Math.PI / 2;
    const hidden = hiddenBehindEarth(sat);

    drawOrbitPath(false);
    if (hidden) drawSatellite(satX, satY, heading, t, 1);
    drawEarth(rotation);
    drawOrbitPath(true);

    const station = surfacePoint(GROUND_STATION.latDeg, GROUND_STATION.lonDeg, rotation);
    const [sx, sy] = toScreen(station);
    const visible = satState !== "dead" && stationSees(sat, station);

    // LEO 的通訊窗口在畫面上只有約 0.15 秒；電腦卡頓時兩格畫面之間可能整個錯過，所以補檢查中間的時刻
    if (satState !== "dead" && !visible) {
      for (let tt = config.lastFrameT + VISIBILITY_SUBSTEP_SECONDS; tt < t; tt += VISIBILITY_SUBSTEP_SECONDS) {
        if (visibleAt(tt)) {
          config.lastVisibleT = tt;
          break;
        }
      }
    }
    config.lastFrameT = t;

    if (visible) {
      ctx.strokeStyle = "rgba(87, 227, 137, 0.9)";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.lineDashOffset = -t * 30;
      ctx.beginPath();
      ctx.moveTo(satX, satY);
      ctx.lineTo(sx, sy);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineWidth = 1;
      config.lastVisibleT = t;
    }

    ctx.fillStyle = visible ? "#57e389" : "#ffd166";
    ctx.fillRect(Math.round(sx) - 3, Math.round(sy) - 3, 6, 6);
    if (config.stationLabel) {
      ctx.font = "11px 'Cubic 11', monospace";
      ctx.fillStyle = "rgba(255, 209, 102, 0.9)";
      // 標籤往地球外側放，才不會蓋住地圖
      const dx = sx - config.cx;
      const dy = sy - config.cy;
      const len = Math.hypot(dx, dy) || 1;
      // 標籤不能超出畫面（手機很窄）
      const w = ctx.measureText(config.stationLabel).width;
      let x = sx + (dx / len) * 10 - (dx >= 0 ? 0 : w);
      x = Math.max(4, Math.min(canvas.width - w - 4, x));
      ctx.fillText(config.stationLabel, x, sy + (dy / len) * 10 + 4);
    }

    // 在地球背後的衛星已經先畫、被地球蓋住了；再疊一層半透明的，讓玩家知道它在哪
    drawSatellite(satX, satY, heading, t, hidden ? 0.35 : 1);
    config.onVisibility(satState !== "dead" && t - config.lastVisibleT < STATUS_HOLD_SECONDS);

    rafId = requestAnimationFrame(frame);
  }

  function start(canvasEl, orbit, onVisibility, stationLabel) {
    stop();
    canvas = canvasEl;
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    ctx = canvas.getContext("2d");
    if (!earthColors) earthColors = buildEarthColors();

    const orbitRadiusKm = EARTH_RADIUS_KM + orbit.altitudeKm;
    const ratio = orbitRadiusKm / EARTH_RADIUS_KM;
    const geo = orbit.id === "geo";
    // LEO 的軌道幾乎是直線穿過北極，畫面可以放大一點；GEO 要放得下整個圓
    const earthRadiusPx = (Math.min(canvas.width, canvas.height) * (geo ? 0.4 : 0.34)) / ratio;
    const periodMin = (2 * Math.PI * Math.sqrt(Math.pow(orbitRadiusKm, 3) / 398600.4418)) / 60;

    earthLowRes = document.createElement("canvas").getContext("2d");
    const earthRes = Math.max(10, Math.min(56, Math.round(earthRadiusPx / 3)));
    earthLowRes.canvas.width = earthRes * 2;
    earthLowRes.canvas.height = earthRes * 2;

    const stars = [];
    for (let i = 0; i < 90; i++) {
      stars.push({ x: Math.floor(hash(i, 1) * canvas.width), y: Math.floor(hash(i, 2) * canvas.height), a: 0.3 + hash(i, 3) * 0.6 });
    }

    // 太陽同步軌道：升交點的地方時是降交點 + 12 小時；太陽在 −X（地方時正午）
    const ascendingNodeHour = (SSO_DESCENDING_NODE_LOCAL_HOUR + 12) % 24;
    const omega = (180 + (ascendingNodeHour - 12) * 15) * DEG;

    config = {
      cx: canvas.width / 2,
      cy: canvas.height / 2 + 22,
      ratio,
      geo,
      earthRadiusPx,
      earthRes,
      // 一開始讓地面站在白天那一側
      earthPhase: Math.PI - GROUND_STATION.lonDeg * DEG - 0.3,
      satPeriod: (EARTH_SPIN_VISUAL_SECONDS * periodMin) / SIDEREAL_DAY_MIN,
      satPhase: 0,
      plane: {
        cosO: Math.cos(omega),
        sinO: Math.sin(omega),
        cosI: Math.cos(SSO_INCLINATION_DEG * DEG),
        sinI: Math.sin(SSO_INCLINATION_DEG * DEG),
      },
      stars,
      deadT: null,
      lastVisibleT: -Infinity,
      lastFrameT: 0,
      stationLabel: stationLabel || "",
      onVisibility: onVisibility || (() => {}),
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
