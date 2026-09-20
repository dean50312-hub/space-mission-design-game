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
  {
    id: "bare_bones",
    icon: "🛠️",
    check: (ctx) =>
      ctx.simResult.overallSuccess &&
      ctx.rocket.id === "light" &&
      SUBSYSTEM_KEYS.every((key) => ctx.parts[key].id === "economy"),
  },
  {
    id: "top_of_the_line",
    icon: "💎",
    check: (ctx) => ctx.simResult.overallSuccess && SUBSYSTEM_KEYS.every((key) => ctx.parts[key].id === "premium"),
  },
  {
    id: "so_close",
    icon: "💔",
    check: (ctx) =>
      !ctx.simResult.overallSuccess &&
      ctx.simResult.failedStage &&
      ["insertion", "deployment", "operation"].includes(ctx.simResult.failedStage.id),
  },
  {
    id: "crisis_management",
    icon: "🧯",
    check: (ctx) => ctx.simResult.overallSuccess && ctx.event.id === "budget_cut",
  },
  {
    id: "flawless_mission",
    icon: "🎯",
    check: (ctx) => ctx.simResult.overallSuccess && Object.values(ctx.scores).every((v) => v >= 95),
  },
  {
    id: "space_polymath",
    icon: "👑",
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
  const list = document.getElementById("achievements-gallery-list");
  list.innerHTML = "";

  ACHIEVEMENTS.forEach((a) => {
    const unlocked = storageIsAchievementUnlocked(a.id);
    const li = document.createElement("li");
    li.className = `gallery-item ${unlocked ? "unlocked" : "locked"}`;

    const textHtml = unlocked
      ? `<div class="gallery-name">${t(`achievement.${a.id}.name`)}</div>
         <div class="gallery-story"><span class="gallery-story-label">${t("achievementsGallery.storyLabel")}</span>${t(`achievement.${a.id}.story`)}</div>`
      : `<div class="gallery-name">${t("achievementsGallery.locked")} <span class="gallery-hint">(${t(`achievement.${a.id}.hint`)})</span></div>`;

    li.innerHTML = `
      <span class="gallery-icon">${unlocked ? a.icon : "❔"}</span>
      <div class="gallery-text">${textHtml}</div>
    `;
    list.appendChild(li);
  });
}
