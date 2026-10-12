// 結果畫面：精算評分與挑戰勳章、事後精算報告（交付 vs 期望、失敗原因、單一調整建議）、任務價值瀑布圖

// ---------- 任務價值瀑布圖：理想任務 100% 一路被各項因素扣掉，最後剩下期望價值 ----------

const WATERFALL_COLORS = {
  total: "rgba(79, 209, 255, 0.85)",
  factorLoss: "rgba(255, 85, 102, 0.85)",
  riskLoss: "rgba(255, 159, 67, 0.85)",
  best: "rgba(179, 136, 255, 0.85)",
  actual: "rgba(87, 227, 137, 0.85)",
};

function waterfallRows(simResult, best) {
  const a = simResult.analysis;
  const rows = [{ label: t("waterfall.ideal"), range: [0, 1], kind: "total" }];
  let v = 1;
  const step = (label, next, kind) => {
    rows.push({ label, range: [Math.min(next, v), Math.max(next, v)], kind, delta: next - v });
    v = next;
  };

  ["coverage", "performance", "delivery", "power", "pointing", "lifetime"].forEach((key) => {
    step(t("factor." + key), v * a.factors[key], "factorLoss");
  });
  rows.push({ label: t("waterfall.designValue"), range: [0, v], kind: "total" });

  step(t("waterfall.launch"), v * a.reliability.launch, "riskLoss");
  step(t("waterfall.deploy"), v * a.reliability.deploy, "riskLoss");
  step(t(gameState.features.operations ? "waterfall.opsWithReserve" : "waterfall.ops"), simResult.expectedValue, "riskLoss");
  rows.push({ label: t("waterfall.expected"), range: [0, simResult.expectedValue], kind: "total" });

  if (best) rows.push({ label: t("waterfall.best"), range: [0, best.ev], kind: "best" });
  rows.push({ label: t("waterfall.actual"), range: [0, simResult.deliveredValue], kind: "actual" });
  return rows;
}

// 在每條長條旁邊寫上數值（扣掉的寫負數）
const waterfallLabelPlugin = {
  id: "waterfallLabels",
  afterDatasetsDraw(chart) {
    const rows = chart.config.options.plugins.waterfallLabels.rows;
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    ctx.save();
    ctx.font = "11px 'Cubic 11', monospace";
    ctx.textBaseline = "middle";
    meta.data.forEach((bar, i) => {
      const row = rows[i];
      const isLoss = row.delta !== undefined;
      let text;
      if (!isLoss) text = fmtPct(row.range[1], 1);
      else if (Math.abs(row.delta) < 0.0005) text = "±0%";
      else text = `${row.delta < 0 ? "−" : "+"}${fmtPct(Math.abs(row.delta), 1)}`;
      ctx.fillStyle = isLoss ? "#ffb3bb" : "#e8ecff";
      ctx.fillText(text, Math.max(bar.x, bar.base) + 6, bar.y);
    });
    ctx.restore();
  },
};

let waterfallChartInstance = null;

function renderWaterfallChart(simResult, best) {
  const rows = waterfallRows(simResult, best);
  const ctx = document.getElementById("waterfall-chart").getContext("2d");
  if (waterfallChartInstance) waterfallChartInstance.destroy();

  waterfallChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: rows.map((r) => r.label),
      datasets: [
        {
          data: rows.map((r) => r.range.map((x) => x * 100)),
          backgroundColor: rows.map((r) => WATERFALL_COLORS[r.kind]),
          borderSkipped: false,
          barPercentage: 0.8,
          categoryPercentage: 0.9,
        },
      ],
    },
    options: {
      indexAxis: "y",
      maintainAspectRatio: false,
      animation: { duration: 900 },
      layout: { padding: { right: 52 } },
      scales: {
        x: {
          min: 0,
          max: 100,
          ticks: { color: "#9aa3d1", font: { family: "'Cubic 11', monospace", size: 11 }, callback: (v) => `${v}%` },
          grid: { color: "#2a2f66" },
        },
        y: {
          ticks: { color: "#e8ecff", font: { size: 12, family: "'Noto Sans TC', sans-serif" } },
          grid: { display: false },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
        waterfallLabels: { rows },
      },
    },
    plugins: [waterfallLabelPlugin],
  });
}

// 標題同時看「衛星活多久」和「交付多少價值」：衛星撐完全程卻幾乎沒交付價值，不能叫圓滿成功
function outcomeKind(simResult) {
  const metGoal = simResult.deliveredValue >= CAMPAIGN_PASS_VALUE;
  if (simResult.overallSuccess) return metGoal ? "success" : "underperform";
  if (simResult.serviceYears > 0) return metGoal ? "partial" : "partialLow";
  return "fail";
}

function resultSubtitle(simResult) {
  const kind = outcomeKind(simResult);
  const years = fmtNum(simResult.serviceYears, 1);
  let text;
  if (kind === "success") {
    text = simResult.propellantDepleted
      ? t("results.subtitleDepleted", { years })
      : t("results.subtitleSuccess", { years });
  } else if (kind === "underperform") {
    text = t("results.subtitleUnderperform", { years, value: fmtPct(simResult.deliveredValue) });
  } else if (kind === "partial" || kind === "partialLow") {
    text = t("results.subtitlePartial", { years: fmtNum(simResult.serviceYears + simResult.extensionYears, 1) });
  } else {
    return t("results.subtitleFail", { stage: t("stage." + simResult.failedStage.id) });
  }
  if (simResult.extensionYears > 0) text += " " + t("results.extensionNote", { years: fmtNum(simResult.extensionYears, 1) });
  return text;
}

function causeExplanation(simResult) {
  if (!simResult.cause) return "";
  const rocketName = t("rocket." + simResult.design.rocket.id + ".name");
  return t("cause." + simResult.cause, {
    rocket: rocketName,
    reliability: fmtPct(simResult.analysis.reliability.rocket, 1),
    example: t("rocketFailure." + simResult.design.rocket.id),
  });
}

function changeDescription(change) {
  if (change.kind === "orbit") return t("hindsight.changeOrbit", { to: t("orbit." + change.to.id) });
  if (change.kind === "rocket") return t("hindsight.changeRocket", { to: t("rocket." + change.to.id + ".name") });
  if (change.kind === "fuel") return t("hindsight.changeFuel", { to: t("fuel." + change.to.id) });
  if (change.kind === "propellant") return t("hindsight.changePropellant", { kg: fmtNum(change.propellantKg) });
  const partName = hotspotLabel(change.key);
  return t("hindsight.changePart", { part: partName, from: t("tier." + change.from.id), to: t("tier." + change.to.id) });
}

function hindsightText(simResult, score) {
  const suggestion = bestSingleChange(simResult.design, gameState.features);
  // 找不到單一改善時，只有分數本來就高才算「很紮實的設計」，否則代表要同時改好幾個地方
  if (!suggestion) return score !== null && score >= CAMPAIGN_PASS_SCORE ? t("hindsight.optimal") : t("hindsight.needsMore");
  let text = t("hindsight.suggest", {
    change: changeDescription(suggestion.change),
    from: fmtPct(suggestion.baseScore),
    to: fmtPct(suggestion.score),
  });
  if (suggestion.change.autoPropellant && suggestion.change.kind !== "propellant" && gameState.features.fuel) {
    text += t("hindsight.withPropellant", { kg: fmtNum(suggestion.change.propellantKg) });
  }
  if (suggestion.change.kind === "orbit") {
    text += t("hindsight.orbitBudget", { budget: fmtMoney(suggestion.change.budgetM) });
  }
  return text;
}

function luckComment(simResult) {
  const diff = simResult.deliveredValue - simResult.expectedValue;
  if (Math.abs(diff) < 0.05) return t("results.luckAsExpected");
  return diff > 0 ? t("results.luckGood") : t("results.luckBad");
}

function decisionSummary(simResult) {
  if (!simResult.decisions || simResult.decisions.length === 0) return "";
  const items = simResult.decisions
    .map((d) => {
      const outcome = d.succeeded === null ? "" : ` ${glyph(d.succeeded ? "check" : "cross")}`;
      return `<li>${t("anomaly." + d.source + ".name")} → ${t("anomalyOption." + d.option + ".label")}${outcome}</li>`;
    })
    .join("");
  return `
    <p class="report-subtitle">${t("results.decisionsHeader", { reserve: fmtMoney(Math.round(simResult.reserveLeftM * 10) / 10) })}</p>
    <ul class="report-decisions">${items}</ul>`;
}

function scoreCardHtml(scoreInfo, simResult) {
  if (scoreInfo.score === null) return "";
  const { score, grade, best, previousBest } = scoreInfo;
  let record;
  if (previousBest === undefined) record = t("results.firstRecord");
  else if (score > previousBest) record = glyph("star") + t("results.newRecord", { previous: previousBest });
  else record = t("results.personalBest", { best: previousBest });

  return `
    <div class="score-card grade-${grade}">
      <div class="score-grade">${grade}</div>
      <div class="score-body">
        <div class="score-label">${t("results.scoreLabel")}</div>
        <div class="score-number">${score}<span class="score-max"> / 100</span></div>
        <div class="score-detail">${t("results.scoreDetail", { ev: fmtPct(simResult.expectedValue, 1), best: fmtPct(best.ev, 1) })}</div>
        <div class="score-record">${record}</div>
      </div>
    </div>
    ${luckNoteHtml(simResult)}
    ${biggestLossHtml(simResult, score)}
    <p class="score-explain">${t("results.scoreExplain")}</p>`;
}

// 這次的結果和期望值差很多時，直接在評分旁邊講清楚：差的部分是運氣，分數評的是設計
const LUCK_NOTE_GAP = 0.15;

function luckNoteHtml(simResult) {
  const gap = simResult.deliveredValue - simResult.expectedValue;
  if (Math.abs(gap) < LUCK_NOTE_GAP) return "";
  const params = { delivered: fmtPct(simResult.deliveredValue), expected: fmtPct(simResult.expectedValue) };
  return `<p class="score-luck">${glyph("tip")}${t(gap < 0 ? "results.luckNoteBad" : "results.luckNoteGood", params)}</p>`;
}

// 瀑布圖裡扣最多的那一項，直接寫在評分下面，附上預算表裡同一段原理說明
const RISK_EXPLAIN_KEYS = { launch: "launch", deploy: "deploy", ops: "ops", opsWithReserve: "ops" };

function biggestLossHtml(simResult, score) {
  if (score >= 95) return "";
  const a = simResult.analysis;
  let worst = null;
  let v = 1;
  ["coverage", "performance", "delivery", "power", "pointing", "lifetime"].forEach((key) => {
    const next = v * a.factors[key];
    if (!worst || v - next > worst.loss) worst = { kind: "factor", key, loss: v - next };
    v = next;
  });
  const risks = [
    ["launch", v * a.reliability.launch],
    ["deploy", v * a.reliability.launch * a.reliability.deploy],
    [gameState.features.operations ? "opsWithReserve" : "ops", simResult.expectedValue],
  ];
  let prev = v;
  risks.forEach(([key, next]) => {
    if (prev - next > worst.loss) worst = { kind: "risk", key, loss: prev - next };
    prev = next;
  });
  if (worst.loss < 0.05) return "";

  const gap = sentenceGap();
  const text = worst.kind === "factor"
    ? t("results.lossFactor", { factor: t("factor." + worst.key), value: fmtPct(a.factors[worst.key]) }) + gap + factorExplanation(worst.key, a)
    : t("results.lossRisk", { risk: t("waterfall." + worst.key), value: fmtPct(worst.loss) }) + gap +
      t("reliabilityExplain." + RISK_EXPLAIN_KEYS[worst.key], { share: fmtPct(RECOVERABLE_ANOMALY_SHARE) });
  return `<p class="score-loss">${glyph("warn")}${text}</p>`;
}

function medalDescription(medal, params) {
  return t(`medal.${medal.id}.desc`, {
    minScore: params.minScore,
    share: params.share !== undefined ? fmtPct(params.share) : "",
    fs: params.fullSuccess !== undefined ? fmtPct(params.fullSuccess) : "",
    rel: params.reliability !== undefined ? fmtPct(params.reliability) : "",
  });
}

function medalsHtml(scoreInfo) {
  const objective = gameState.missionObjective;
  const items = scoreInfo.medals
    .map(({ medal, params, isNew, owned }) => {
      const state = isNew ? "new" : owned ? "owned" : "locked";
      const desc = medalDescription(medal, params);
      return `
        <li class="medal ${state}">
          <img class="medal-icon" src="image/icons/${owned ? "medal-" + medal.id : "locked"}.png" alt="" />
          <div class="medal-text">
            <div class="medal-name">${t(`medal.${medal.id}.name`)}<span class="medal-state">${t("results.medal_" + state)}</span></div>
            <div class="medal-desc">${desc}</div>
          </div>
        </li>`;
    })
    .join("");
  return `
    <h3 class="medals-title">${t("results.medalsHeader", { mission: t("objective." + objective.id + ".short") })}</h3>
    <ul class="medal-list">${items}</ul>`;
}

function bestDesignHtml(best) {
  if (!best) return "";
  const objective = gameState.missionObjective;
  const reserve = Math.round((best.budgetM - best.costM) * 10) / 10;
  return `
    <details class="best-design" id="best-design">
      <summary>${t("results.bestDesignSummary", { ev: fmtPct(best.ev, 1) })}</summary>
      <p class="best-design-note">${t("results.bestDesignCost", { cost: fmtMoney(best.costM), budget: fmtMoney(best.budgetM), reserve: fmtMoney(reserve) })}</p>
      <div class="best-design-rows" id="best-design-rows"><p class="best-design-note">${t("results.bestDesignComputing")}</p></div>
      <p class="best-design-note">${t("results.bestDesignAltNote")}</p>
      <p class="best-design-note">${t("results.bestDesignNote", { mission: t("objective." + objective.id + ".short") })}</p>
    </details>`;
}

// ---------- 理論最佳設計的每一個選擇：只換這一項（其他不變、推進劑重新計算），期望值會差多少 ----------

function designFromSummary(best, objective, event) {
  const findTier = (key) => (key === "payload" ? payloadOptionsFor(objective) : SUBSYSTEMS[key]).find((o) => o.id === best.parts[key]);
  return {
    objective,
    orbit: findOrbit(best.orbit),
    event,
    budgetM: best.budgetM,
    rocket: ROCKETS.find((r) => r.id === best.rocket),
    parts: Object.fromEntries(SUBSYSTEM_KEYS.map((key) => [key, findTier(key)])),
    fuel: FUELS.find((f) => f.id === best.fuel),
    propellantKg: best.propellantKg,
  };
}

// 推進劑同時試「維持原本的量」和「重新自動計算」，取比較好的那個（和事後精算的做法一樣）
function alternativeOutcome(variant, features, bestEv) {
  const auto = { ...variant };
  auto.propellantKg = autoPropellantKg(auto);
  const tries = features.fuel ? [{ ...variant }, auto] : [auto];
  const first = analyzeDesign(tries[0]);
  if (first.unavailable) return { kind: "unavailable" };
  if (first.overBudget) return { kind: "overBudget", over: first.costM - variant.budgetM };
  let ev = null;
  tries.forEach((v) => {
    const a = analyzeDesign(v);
    if (a.noCapacity || a.overMass) return;
    const value = computeExpectedValue(v, features, a);
    if (ev === null || value > ev) ev = value;
  });
  return ev === null ? { kind: "overMass" } : { kind: "ev", delta: ev - bestEv };
}

function bestDesignRows(best, features) {
  const objective = gameState.missionObjective;
  const event = gameState.event;
  const base = designFromSummary(best, objective, event);
  const rows = [];
  const budgetDelta = (event && event.effect.budgetDeltaM) || 0;

  rows.push({
    label: t("selection.orbitGroup"),
    choice: t("orbit." + best.orbit),
    alts: ORBITS.filter((o) => o !== base.orbit).map((orbit) => {
      const variant = { ...base, orbit, budgetM: missionBudgetM(objective, orbit) + budgetDelta };
      if (!features.fuel) variant.fuel = defaultFuelForOrbit(orbit.id);
      return { name: t("orbitShort." + orbit.id), outcome: alternativeOutcome(variant, features, best.ev) };
    }),
  });
  rows.push({
    label: t("selection.rocketGroup"),
    choice: t("rocket." + best.rocket + ".name"),
    alts: ROCKETS.filter((r) => r !== base.rocket).map((rocket) => ({
      name: t("rocket." + rocket.id + ".name"),
      outcome: alternativeOutcome({ ...base, rocket }, features, best.ev),
    })),
  });
  SUBSYSTEM_KEYS.forEach((key) => {
    if (key === "attitude" && !features.attitude) return;
    const options = key === "payload" ? payloadOptionsFor(objective) : SUBSYSTEMS[key];
    rows.push({
      label: hotspotLabel(key),
      choice: t("tier." + best.parts[key]),
      alts: options.filter((o) => o !== base.parts[key]).map((tier) => ({
        name: t("tier." + tier.id),
        outcome: alternativeOutcome({ ...base, parts: { ...base.parts, [key]: tier } }, features, best.ev),
      })),
    });
  });
  if (features.fuel) {
    rows.push({
      label: t("selection.fuelGroup"),
      choice: `${t("fuel." + best.fuel)} · ${fmtNum(best.propellantKg)} kg`,
      alts: FUELS.filter((f) => f !== base.fuel).map((fuel) => ({
        name: t("fuel." + fuel.id),
        outcome: alternativeOutcome({ ...base, fuel }, features, best.ev),
      })),
    });
  }
  return rows;
}

function altChipHtml({ name, outcome }) {
  let cls = "blocked";
  let text;
  if (outcome.kind === "unavailable") text = t("results.altUnavailable");
  else if (outcome.kind === "overMass") text = t("results.altOverMass");
  else if (outcome.kind === "overBudget") text = t("results.altOverBudget", { over: fmtMoney(Math.ceil(outcome.over * 10) / 10) });
  else {
    const d = outcome.delta;
    cls = d < -0.0005 ? "worse" : "same";
    text = Math.abs(d) < 0.0005 ? "±0%" : `${d < 0 ? "−" : "+"}${fmtPct(Math.abs(d), 1)}`;
  }
  return `<span class="alt-chip ${cls}"><span class="alt-name">${name}</span>${text}</span>`;
}

// 展開時才計算（有運作期決策時每個替代方案都要跑蒙地卡羅，約需半秒）
function fillBestDesignRows(best) {
  const target = document.getElementById("best-design-rows");
  if (!target || target.dataset.filled) return;
  target.dataset.filled = "1";
  setTimeout(() => {
    const rows = bestDesignRows(best, gameState.features);
    target.innerHTML = rows
      .map((row) => `
        <div class="alt-row">
          <div class="alt-head"><span class="alt-label">${row.label}</span><span class="alt-choice">${row.choice}</span></div>
          <div class="alt-chips">${row.alts.map(altChipHtml).join("")}</div>
        </div>`)
      .join("");
  }, 30);
}

function renderResultsScreen(simResult, achievements, campaignAward, scoreInfo) {
  const kind = outcomeKind(simResult);
  document.getElementById("result-title").textContent = t("results.title_" + kind);
  document.getElementById("result-subtitle").textContent = resultSubtitle(simResult);

  const reason = document.getElementById("result-reason");
  const cause = causeExplanation(simResult);
  reason.textContent = cause;
  reason.classList.toggle("hidden", !cause);

  document.getElementById("result-score").innerHTML = scoreCardHtml(scoreInfo, simResult) + medalsHtml(scoreInfo);

  document.getElementById("result-report").innerHTML = `
    <div class="report-numbers">
      <div class="report-number">
        <span class="report-number-label">${t("results.delivered")}</span>
        <span class="report-number-value">${fmtPct(simResult.deliveredValue)}</span>
      </div>
      <div class="report-number">
        <span class="report-number-label">${t("results.expected")}</span>
        <span class="report-number-value dim">${fmtPct(simResult.expectedValue)}</span>
      </div>
    </div>
    <p class="report-luck">${luckComment(simResult)}</p>
    ${decisionSummary(simResult)}
    <p class="report-hindsight">${glyph("tip")}${hindsightText(simResult, scoreInfo.score)}</p>
    ${bestDesignHtml(scoreInfo.best)}
  `;

  const campaignNote = document.getElementById("result-campaign-note");
  if (gameState.campaignLevel) {
    let text;
    if (!campaignAward) {
      text = t("results.campaignRetry", { target: fmtPct(CAMPAIGN_PASS_VALUE), score: CAMPAIGN_PASS_SCORE });
    } else {
      text = campaignAward.level >= 4
        ? t("results.campaignAllComplete", { points: campaignAward.points })
        : t("results.campaignLevelComplete", { level: campaignAward.level, points: campaignAward.points });
      if (campaignAward.byScore) text = t("results.campaignPassByScore", { score: scoreInfo.score }) + " " + text;
    }
    campaignNote.textContent = text;
    campaignNote.classList.toggle("retry", !campaignAward);
    campaignNote.classList.remove("hidden");
  } else {
    campaignNote.classList.add("hidden");
  }

  renderWaterfallChart(simResult, scoreInfo.best);

  const bestDetails = document.getElementById("best-design");
  if (bestDetails) bestDetails.addEventListener("toggle", () => bestDetails.open && fillBestDesignRows(scoreInfo.best));

  const achList = document.getElementById("achievements-list");
  achList.innerHTML = "";

  if (achievements.length === 0) {
    achList.innerHTML = `<li class="no-achievement">${t("results.noAchievement")}</li>`;
  } else {
    achievements.forEach((a) => {
      const li = document.createElement("li");
      li.innerHTML = `<img src="image/icons/achievement-${a.id}.png" alt="" />${t("achievement." + a.id + ".name")}`;
      achList.appendChild(li);
    });
  }
}
