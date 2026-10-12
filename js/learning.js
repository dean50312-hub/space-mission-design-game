// 學習目標與「你學到了什麼」小測驗（組員陳沅澧的建議）
// 每關開始前列出可檢驗的學習目標；結果頁抽 2 題選擇題，答對就在目標上打勾。測驗不影響分數和過關。

const LEARNING_OBJECTIVES_BY_LEVEL = {
  1: ["o_orbit", "o_comm"],
  2: ["o_rocket_eq", "o_electric", "o_torquer"],
  3: ["o_env"],
  4: ["o_reserve", "o_repair"],
};

const QUIZ_PER_MISSION = 2;

// params：題目裡用到的數字，盡量取自這次任務的設計
const QUIZ_QUESTIONS = [
  {
    id: "q_res_altitude",
    level: 1,
    objective: "o_orbit",
    params: () => {
      const aperture = PAYLOADS.optical[PAYLOADS.optical.length - 1].apertureM;
      return {
        leo: fmtDistance(groundSampleDistanceM(aperture, ORBITS[0].altitudeKm)),
        geo: fmtDistance(groundSampleDistanceM(aperture, ORBITS[1].altitudeKm)),
      };
    },
  },
  { id: "q_weather_geo", level: 1, objective: "o_orbit" },
  {
    id: "q_geo_comm",
    level: 1,
    objective: "o_comm",
    params: (design) => {
      const comm = design.parts.comm || SUBSYSTEMS.comm[1];
      return { leo: fmtRate(comm.rateMbps.leo), geo: fmtRate(comm.rateMbps.geo) };
    },
  },
  { id: "q_log_dv", level: 2, objective: "o_rocket_eq" },
  { id: "q_electric", level: 2, objective: "o_electric" },
  { id: "q_torquer", level: 2, objective: "o_torquer" },
  { id: "q_radiation", level: 3, objective: "o_env" },
  { id: "q_debris", level: 3, objective: "o_env" },
  { id: "q_reserve", level: 4, objective: "o_reserve" },
  { id: "q_repair", level: 4, objective: "o_repair" },
];

function shuffled(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 劇情關卡只考這一關教的機制；自由遊玩從全部題庫抽
function pickQuiz(level, design) {
  const pool = QUIZ_QUESTIONS.filter((q) => (level ? q.level === level : true));
  return shuffled(pool)
    .slice(0, QUIZ_PER_MISSION)
    .map((q) => ({
      id: q.id,
      objective: q.objective,
      params: q.params ? q.params(design) : {},
      order: shuffled([0, 1, 2]), // 選項 0 是正確答案，顯示時打亂
      answered: null,
    }));
}

function quizOptionText(item, option) {
  return t(`learn.q.${item.id}.options`, item.params).split("|")[option];
}

function quizHtml(quiz) {
  if (!quiz || quiz.length === 0) return "";
  const items = quiz
    .map((item, index) => {
      const answered = item.answered !== null;
      const buttons = item.order
        .map((option) => {
          let cls = "quiz-option";
          if (answered && option === 0) cls += " correct";
          else if (answered && option === item.answered) cls += " wrong";
          return `<button type="button" class="${cls}" data-quiz="${index}" data-option="${option}" ${answered ? "disabled" : ""}>${quizOptionText(item, option)}</button>`;
        })
        .join("");
      const feedback = answered
        ? `<p class="quiz-feedback ${item.answered === 0 ? "correct" : "wrong"}">${glyph(item.answered === 0 ? "check" : "cross")}${
            item.answered === 0 ? t("learn.correct") : t("learn.wrong", { answer: quizOptionText(item, 0) })
          }${sentenceGap()}${t(`learn.q.${item.id}.explain`, item.params)}</p>`
        : "";
      return `
        <li class="quiz-item">
          <p class="quiz-prompt">${index + 1}. ${t(`learn.q.${item.id}.prompt`, item.params)}</p>
          <div class="quiz-options">${buttons}</div>
          ${feedback}
        </li>`;
    })
    .join("");
  return `
    <h3 class="section-title">${t("learn.quizTitle")}</h3>
    <p class="section-hint">${t("learn.quizHint")}</p>
    <ol class="quiz-list panel">${items}</ol>`;
}

function renderQuiz(quiz) {
  const el = document.getElementById("result-quiz");
  el.innerHTML = quizHtml(quiz);
  el.querySelectorAll(".quiz-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = quiz[Number(btn.dataset.quiz)];
      if (item.answered !== null) return;
      item.answered = Number(btn.dataset.option);
      if (item.answered === 0) {
        storageMarkObjectiveLearned(item.objective);
        sfxPass();
      } else {
        sfxFail();
      }
      renderQuiz(quiz);
    });
  });
}

// 任務簡報上的「本關學習目標」：測驗答對過的目標打勾
function renderLearningObjectives() {
  const el = document.getElementById("event-objectives");
  const ids = gameState.campaignLevel ? LEARNING_OBJECTIVES_BY_LEVEL[gameState.campaignLevel] : null;
  el.classList.toggle("hidden", !ids);
  if (!ids) return;
  el.innerHTML = `
    <div class="objectives-title">${t("learn.objectivesTitle", { level: gameState.campaignLevel })}</div>
    <ul>${ids
      .map((id) => {
        const done = storageIsObjectiveLearned(id);
        return `<li class="${done ? "done" : ""}">${done ? glyph("check") : '<span class="objective-box"></span>'}${t("learn.obj." + id)}</li>`;
      })
      .join("")}</ul>
    <p class="objectives-hint">${t("learn.objectivesHint")}</p>`;
}
