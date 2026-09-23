// 結果畫面：雷達圖計分與渲染

const RADAR_AXES = ["mass", "power", "comm", "orbital", "science", "budget"];

function sweetSpotScore(ratio) {
  const diff = Math.abs(ratio - 0.9);
  const score = 100 - Math.min(100, diff * 250);
  return Math.max(0, score);
}

function computeRadarScores(simResult) {
  const reachedIndex = simResult.stageReachedIndex;
  const parts = gameState.parts;

  const power = reachedIndex >= 3 ? parts.power.value : 0;
  const comm = reachedIndex >= 3 ? parts.comm.value : 0;
  const orbital = reachedIndex >= 2 ? fuelPropulsionValue() : 0;
  const science = reachedIndex >= 4 ? parts.science.value : 0;

  const massRatio = currentMassUsed() / gameState.rocket.maxPayload;
  const costRatio = (currentCostUsed() + gameState.incidentPenalty) / gameState.budget;

  return {
    mass: Math.round(sweetSpotScore(massRatio)),
    power: Math.round(power),
    comm: Math.round(comm),
    orbital: Math.round(orbital),
    science: Math.round(science),
    budget: Math.round(sweetSpotScore(costRatio)),
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
          label: t("results.achievementsHeader"),
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

function composeFailureReason(failedChecks) {
  if (!failedChecks || failedChecks.length === 0) return "";
  return failedChecks
    .map((c) => {
      if (c.statKey === "orbit_mismatch") {
        return t("results.reasonOrbitMismatch", {
          objective: t("objective." + gameState.missionObjective.id + ".short"),
          correctOrbit: t("orbit." + gameState.missionObjective.correctOrbit),
          chosenOrbit: t("orbit." + gameState.orbit.id),
        });
      }
      const stat = t("stat." + c.statKey);
      return c.margin < 0
        ? t("results.reasonShortfall", { stat, value: c.value, threshold: c.threshold })
        : t("results.reasonBadLuck", { stat });
    })
    .join("；");
}

function renderResultsScreen(simResult, scores, achievements, campaignAward) {
  const title = document.getElementById("result-title");
  const subtitle = document.getElementById("result-subtitle");
  const reason = document.getElementById("result-reason");
  const campaignNote = document.getElementById("result-campaign-note");

  title.textContent = simResult.overallSuccess ? t("results.successTitle") : t("results.failTitle");
  subtitle.textContent = simResult.overallSuccess
    ? t("results.successSubtitle")
    : t("results.failSubtitle", { stage: t("stage." + simResult.failedStage.id) });

  if (!simResult.overallSuccess) {
    reason.textContent = composeFailureReason(simResult.failedChecks);
    reason.classList.remove("hidden");
  } else {
    reason.classList.add("hidden");
  }

  if (campaignAward) {
    campaignNote.textContent =
      campaignAward.level >= 4
        ? t("results.campaignAllComplete", { points: campaignAward.points })
        : t("results.campaignLevelComplete", { level: campaignAward.level, points: campaignAward.points });
    campaignNote.classList.remove("hidden");
  } else {
    campaignNote.classList.add("hidden");
  }

  renderRadarChart(scores);

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
