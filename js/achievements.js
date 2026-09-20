// 成就判定

const ACHIEVEMENTS = [
  {
    id: "first_orbit",
    icon: "🏆",
    name: "首次入軌成功",
    check: (ctx) => ctx.simResult.overallSuccess,
  },
  {
    id: "under_budget",
    icon: "💰",
    name: "精打細算",
    check: (ctx) => ctx.simResult.overallSuccess && ctx.cost < ctx.budget * 0.6,
  },
  {
    id: "storm_survivor",
    icon: "🛡️",
    name: "力抗風暴",
    check: (ctx) => ctx.simResult.overallSuccess && ["solar_flare", "geomagnetic_storm"].includes(ctx.event.id),
  },
  {
    id: "all_rounder",
    icon: "⭐",
    name: "全能設計",
    check: (ctx) => Object.values(ctx.scores).every((v) => v >= 80),
  },
  {
    id: "glorious_failure",
    icon: "💥",
    name: "雖敗猶榮",
    check: (ctx) =>
      !ctx.simResult.overallSuccess &&
      ctx.simResult.failedStage &&
      ["liftoff", "ascent"].includes(ctx.simResult.failedStage.id),
  },
  {
    id: "never_give_up",
    icon: "🔁",
    name: "屢敗屢戰",
    check: (ctx) => ctx.simResult.overallSuccess && ctx.failCountBeforeThis >= 5,
  },
];

function evaluateAchievements(ctx) {
  return ACHIEVEMENTS.filter((a) => a.check(ctx));
}
