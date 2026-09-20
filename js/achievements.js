// 成就判定與成就展示畫面

const ACHIEVEMENTS = [
  {
    id: "first_orbit",
    icon: "🏆",
    check: (ctx) => ctx.simResult.overallSuccess,
  },
  {
    id: "under_budget",
    icon: "💰",
    check: (ctx) => ctx.simResult.overallSuccess && ctx.cost < ctx.budget * 0.6,
  },
  {
    id: "storm_survivor",
    icon: "🛡️",
    check: (ctx) => ctx.simResult.overallSuccess && ["solar_flare", "geomagnetic_storm"].includes(ctx.event.id),
  },
  {
    id: "all_rounder",
    icon: "⭐",
    check: (ctx) => Object.values(ctx.scores).every((v) => v >= 80),
  },
  {
    id: "glorious_failure",
    icon: "💥",
    check: (ctx) =>
      !ctx.simResult.overallSuccess &&
      ctx.simResult.failedStage &&
      ["liftoff", "ascent"].includes(ctx.simResult.failedStage.id),
  },
  {
    id: "never_give_up",
    icon: "🔁",
    check: (ctx) => ctx.simResult.overallSuccess && ctx.failCountBeforeThis >= 5,
  },
];

function evaluateAchievements(ctx) {
  const unlocked = ACHIEVEMENTS.filter((a) => a.check(ctx));
  unlocked.forEach((a) => storageUnlockAchievement(a.id));
  return unlocked;
}

function renderAchievementsGallery() {
  const list = document.getElementById("achievements-gallery-list");
  list.innerHTML = "";

  ACHIEVEMENTS.forEach((a) => {
    const unlocked = storageIsAchievementUnlocked(a.id);
    const li = document.createElement("li");
    li.className = `gallery-item ${unlocked ? "unlocked" : "locked"}`;

    const textHtml = unlocked
      ? `<div class="gallery-name">${t(`achievement.${a.id}.name`)}</div>
         <div class="gallery-story"><span class="gallery-story-label">${t("achievementsGallery.storyLabel")}</span>${t(`achievement.${a.id}.story`)}</div>`
      : `<div class="gallery-name">${t("achievementsGallery.locked")}</div>`;

    li.innerHTML = `
      <span class="gallery-icon">${unlocked ? a.icon : "❔"}</span>
      <div class="gallery-text">${textHtml}</div>
    `;
    list.appendChild(li);
  });
}
