// 結果畫面：事後精算報告（交付價值 vs 期望價值、失敗原因、單一調整建議、任務指標雷達圖）

const RADAR_AXES = ["coverage", "performance", "delivery", "power", "lifetime", "reliability"];

function radarScores(simResult) {
  const a = simResult.analysis;
  return {
    coverage: Math.round(a.factors.coverage * 100),
    performance: Math.round(a.factors.performance * 100),
    delivery: Math.round(a.factors.delivery * 100),
    power: Math.round(a.factors.power * 100),
    lifetime: Math.round(a.factors.lifetime * 100),
    reliability: Math.round(a.fullSuccess * 100),
  };
}

let radarChartInstance = null;

function renderRadarChart(scores) {
  const ctx = document.getElementById("radar-chart").getContext("2d");
  const labels = RADAR_AXES.map((key) => t("radar." + key));
  const data = RADAR_AXES.map((key) => scores[key]);

  if (radarChartInstance) radarChartInstance.destroy();

  radarChartInstance = new Chart(ctx, {
    type: "radar",
    data: {
      labels,
      datasets: [
        {
          label: t("results.radarLabel"),
          data,
          backgroundColor: "rgba(79, 209, 255, 0.3)",
          borderColor: "rgba(79, 209, 255, 1)",
          pointBackgroundColor: "rgba(79, 209, 255, 1)",
        },
      ],
    },
    options: {
      scales: {
        r: {
          min: 0,
          max: 100,
          ticks: { stepSize: 20, backdropColor: "transparent", color: "#9aa3d1" },
          grid: { color: "#2a2f66" },
          angleLines: { color: "#2a2f66" },
          pointLabels: { color: "#e8ecff", font: { size: 11 } },
        },
      },
      plugins: {
        legend: { display: false },
      },
    },
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
      const outcome = d.succeeded === null ? "" : d.succeeded ? ` ✅` : ` ❌`;
      return `<li>${t("anomaly." + d.source + ".name")} → ${t("anomalyOption." + d.option + ".label")}${outcome}</li>`;
    })
    .join("");
  return `
    <p class="report-subtitle">${t("results.decisionsHeader", { reserve: fmtMoney(Math.round(simResult.reserveLeftM * 10) / 10) })}</p>
    <ul class="report-decisions">${items}</ul>`;
}

function renderResultsScreen(simResult, achievements, campaignAward) {
  const kind = outcomeKind(simResult);
  document.getElementById("result-title").textContent = t("results.title_" + kind);
  document.getElementById("result-subtitle").textContent = resultSubtitle(simResult);

  const reason = document.getElementById("result-reason");
  const cause = causeExplanation(simResult);
  reason.textContent = cause;
  reason.classList.toggle("hidden", !cause);

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
    <p class="report-hindsight">💡 ${hindsightText(simResult)}</p>
  `;

  const campaignNote = document.getElementById("result-campaign-note");
  if (gameState.campaignLevel) {
    campaignNote.textContent = campaignAward
      ? campaignAward.level >= 4
        ? t("results.campaignAllComplete", { points: campaignAward.points })
        : t("results.campaignLevelComplete", { level: campaignAward.level, points: campaignAward.points })
      : t("results.campaignRetry", { target: fmtPct(CAMPAIGN_PASS_VALUE) });
    campaignNote.classList.remove("hidden");
  } else {
    campaignNote.classList.add("hidden");
  }

  renderRadarChart(radarScores(simResult));

  const achList = document.getElementById("achievements-list");
  achList.innerHTML = "";

  if (achievements.length === 0) {
    achList.innerHTML = `<li class="no-achievement">${t("results.noAchievement")}</li>`;
  } else {
    achievements.forEach((a) => {
      const li = document.createElement("li");
      li.textContent = `${a.icon} ${t("achievement." + a.id + ".name")}`;
      achList.appendChild(li);
    });
  }
}
