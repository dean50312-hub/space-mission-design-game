// 成就判定與成就展示畫面

const ACHIEVEMENTS = [
  {
    id: "first_orbit",
    check: (ctx) => ctx.simResult.overallSuccess,
  },
  {
    id: "under_budget",
    check: (ctx) => ctx.simResult.overallSuccess && ctx.analysis.costM < ctx.analysis.budgetM * 0.6,
  },
  {
    id: "storm_survivor",
    check: (ctx) => ctx.simResult.overallSuccess && Boolean(ctx.event) && ["solar_flare", "geomagnetic_storm"].includes(ctx.event.id),
  },
  {
    id: "all_rounder",
    check: (ctx) => ctx.simResult.overallSuccess && Object.values(ctx.analysis.factors).every((v) => v >= 0.8),
  },
  {
    id: "glorious_failure",
    check: (ctx) =>
      !ctx.simResult.overallSuccess &&
      ctx.simResult.failedStage &&
      ["liftoff", "ascent"].includes(ctx.simResult.failedStage.id),
  },
  {
    id: "never_give_up",
    check: (ctx) => ctx.simResult.overallSuccess && ctx.failCountBeforeThis >= 5,
  },
  {
    id: "bare_bones",
    check: (ctx) =>
      ctx.simResult.overallSuccess &&
      ctx.rocket.id === "light" &&
      SUBSYSTEM_KEYS.every((key) => ctx.parts[key].id === "economy"),
  },
  {
    id: "top_of_the_line",
    check: (ctx) => ctx.simResult.overallSuccess && SUBSYSTEM_KEYS.every((key) => ctx.parts[key].id === "premium"),
  },
  {
    id: "so_close",
    check: (ctx) =>
      !ctx.simResult.overallSuccess &&
      ctx.simResult.failedStage &&
      ["insertion", "deployment", "operation"].includes(ctx.simResult.failedStage.id),
  },
  {
    id: "crisis_management",
    check: (ctx) => ctx.simResult.overallSuccess && Boolean(ctx.event) && ctx.event.id === "budget_cut",
  },
  {
    id: "flawless_mission",
    check: (ctx) => ctx.simResult.deliveredValue >= 0.95,
  },
  {
    id: "extended_mission",
    check: (ctx) => ctx.simResult.extensionYears >= 2,
  },
  {
    id: "space_polymath",
    meta: true,
    check: () => ACHIEVEMENTS.filter((a) => !a.meta).every((a) => storageIsAchievementUnlocked(a.id)),
  },
];

function evaluateAchievements(ctx) {
  const unlocked = ACHIEVEMENTS.filter((a) => !a.meta && a.check(ctx)).filter(
    (a) => !storageIsAchievementUnlocked(a.id)
  );
  unlocked.forEach((a) => storageUnlockAchievement(a.id));

  const meta = ACHIEVEMENTS.filter((a) => a.meta && !storageIsAchievementUnlocked(a.id) && a.check(ctx));
  meta.forEach((a) => storageUnlockAchievement(a.id));

  return [...unlocked, ...meta];
}

function renderAchievementsGallery() {
  let owned = 0;
  let total = 0;
  document.getElementById("medal-gallery").innerHTML = MISSION_OBJECTIVES.map((objective) => {
    const medals = medalsFor(objective)
      .map((medal) => {
        const has = storageHasMedal(objective.id, medal.id);
        const p = medal.params(objective);
        const desc = medalDescription(medal, p);
        total++;
        if (has) owned++;
        return `<img src="image/icons/medal-${medal.id}.png" class="${has ? "" : "locked"}" title="${t(`medal.${medal.id}.name`)}：${desc}" alt="" />`;
      })
      .join("");
    const best = storageGetBestScore(objective.id);
    return `
      <div class="medal-row">
        <img class="medal-row-icon" src="image/icons/objective-${objective.id}.png" alt="" />
        <span class="medal-row-name">${t("objective." + objective.id + ".short")}</span>
        <span class="medal-row-best">${best === undefined ? t("home.notPlayed") : t("achievementsGallery.bestScore", { score: best })}</span>
        <span class="medal-row-medals">${medals}</span>
      </div>`;
  }).join("");
  document.getElementById("medal-count").textContent = `${owned} / ${total}`;

  const list = document.getElementById("achievements-gallery-list");
  list.innerHTML = "";
  let unlockedCount = 0;

  ACHIEVEMENTS.forEach((a) => {
    const unlocked = storageIsAchievementUnlocked(a.id);
    if (unlocked) unlockedCount++;
    const li = document.createElement("li");
    li.className = `gallery-item ${unlocked ? "unlocked" : "locked"}`;

    const textHtml = unlocked
      ? `<div class="gallery-name">${t(`achievement.${a.id}.name`)}</div>
         <div class="gallery-story"><span class="gallery-story-label">${glyph("book")}${t("achievementsGallery.storyLabel")}</span>${t(`achievement.${a.id}.story`)}</div>`
      : `<div class="gallery-name">${t("achievementsGallery.locked")}</div><span class="gallery-hint">${t(`achievement.${a.id}.hint`)}</span>`;

    li.innerHTML = `
      <img class="gallery-icon" src="image/icons/achievement-${a.id}.png" alt="" />
      <div class="gallery-text">${textHtml}</div>
    `;
    list.appendChild(li);
  });
  document.getElementById("achievement-count").textContent = `${unlockedCount} / ${ACHIEVEMENTS.length}`;
}
