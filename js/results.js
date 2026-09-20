// 結果畫面：雷達圖計分與渲染

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
  const orbital = reachedIndex >= 2 ? parts.propulsion.value : 0;
  const science = reachedIndex >= 4 ? parts.science.value : 0;

  const massRatio = currentMassUsed() / gameState.rocket.maxPayload;
  const costRatio = currentCostUsed() / gameState.budget;

  return {
    質量效率: Math.round(sweetSpotScore(massRatio)),
    電力: Math.round(power),
    通訊: Math.round(comm),
    軌道可靠度: Math.round(orbital),
    科學酬載: Math.round(science),
    預算效率: Math.round(sweetSpotScore(costRatio)),
  };
}

let radarChartInstance = null;

function renderRadarChart(scores) {
  const ctx = document.getElementById("radar-chart").getContext("2d");
  const labels = Object.keys(scores);
  const data = Object.values(scores);

  if (radarChartInstance) radarChartInstance.destroy();

  radarChartInstance = new Chart(ctx, {
    type: "radar",
    data: {
      labels,
      datasets: [
        {
          label: "任務表現",
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

function renderResultsScreen(simResult, scores, achievements) {
  const title = document.getElementById("result-title");
  const subtitle = document.getElementById("result-subtitle");

  title.textContent = simResult.overallSuccess ? "任務成功！" : "任務失敗";
  subtitle.textContent = simResult.overallSuccess
    ? "衛星已成功進入軌道並開始運作。"
    : `任務在「${simResult.failedStage.name}」階段失敗。`;

  renderRadarChart(scores);

  const achList = document.getElementById("achievements-list");
  achList.innerHTML = "";

  if (achievements.length === 0) {
    achList.innerHTML = '<li class="no-achievement">這次沒有解鎖成就，再試一次！</li>';
  } else {
    achievements.forEach((a) => {
      const li = document.createElement("li");
      li.textContent = `${a.icon} ${a.name}`;
      achList.appendChild(li);
    });
  }
}
