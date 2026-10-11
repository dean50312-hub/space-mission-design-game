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

function outcomeKind(simResult) {
  if (simResult.overallSuccess) return "success";
  return simResult.serviceYears > 0 ? "partial" : "fail";
}

function resultSubtitle(simResult) {
  const kind = outcomeKind(simResult);
  const years = fmtNum(simResult.serviceYears, 1);
  let text;
  if (kind === "success") {
    text = simResult.propellantDepleted
      ? t("results.subtitleDepleted", { years })
      : t("results.subtitleSuccess", { years });
  } else if (kind === "partial") {
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
  });
}

function changeDescription(change) {
  if (change.kind === "rocket") return t("hindsight.changeRocket", { to: t("rocket." + change.to.id + ".name") });
  if (change.kind === "fuel") return t("hindsight.changeFuel", { to: t("fuel." + change.to.id) });
  if (change.kind === "propellant") return t("hindsight.changePropellant", { kg: fmtNum(change.propellantKg) });
  const partName = hotspotLabel(change.key);
  return t("hindsight.changePart", { part: partName, from: t("tier." + change.from.id), to: t("tier." + change.to.id) });
}

function hindsightText(simResult) {
  const suggestion = bestSingleChange(simResult.design, gameState.features);
  if (!suggestion) return t("hindsight.optimal");
  let text = t("hindsight.suggest", {
    change: changeDescription(suggestion.change),
    from: fmtPct(suggestion.baseScore),
    to: fmtPct(suggestion.score),
  });
  if (suggestion.change.autoPropellant && suggestion.change.kind !== "propellant" && gameState.features.fuel) {
    text += t("hindsight.withPropellant", { kg: fmtNum(suggestion.change.propellantKg) });
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
    <p class="score-explain">${t("results.scoreExplain")}</p>`;
}

function medalsHtml(scoreInfo) {
  const objective = gameState.missionObjective;
  const items = scoreInfo.medals
    .map(({ medal, params, isNew, owned }) => {
      const state = isNew ? "new" : owned ? "owned" : "locked";
      const desc = t(`medal.${medal.id}.desc`, {
        minScore: params.minScore,
        share: params.share !== undefined ? fmtPct(params.share) : "",
        fs: params.fullSuccess !== undefined ? fmtPct(params.fullSuccess) : "",
      });
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
  const lines = [
    `${t("selection.orbitGroup")}：${t("orbit." + best.orbit)}`,
    `${t("selection.rocketGroup")}：${t("rocket." + best.rocket + ".name")}`,
    ...SUBSYSTEM_KEYS.map((key) => `${hotspotLabel(key)}：${t("tier." + best.parts[key])}`),
    `${t("selection.fuelGroup")}：${t("fuel." + best.fuel)} · ${fmtNum(best.propellantKg)} kg`,
    t("results.bestDesignCost", { cost: fmtMoney(best.costM), budget: fmtMoney(best.budgetM), reserve: fmtMoney(reserve) }),
  ];
  return `
    <details class="best-design">
      <summary>${t("results.bestDesignSummary", { ev: fmtPct(best.ev, 1) })}</summary>
      <ul>${lines.map((l) => `<li>${l}</li>`).join("")}</ul>
      <p class="best-design-note">${t("results.bestDesignNote", { mission: t("objective." + objective.id + ".short") })}</p>
    </details>`;
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
    <p class="report-hindsight">${glyph("tip")}${hindsightText(simResult)}</p>
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
    campaignNote.classList.remove("hidden");
  } else {
    campaignNote.classList.add("hidden");
  }

  renderWaterfallChart(simResult, scoreInfo.best);

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
