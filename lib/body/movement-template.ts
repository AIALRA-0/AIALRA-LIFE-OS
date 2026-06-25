import { getUtcDayOfWeek } from "@/lib/routes/current-week";
import bodyRoutesSeed from "@/seed/body-routes.seed.json";

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const movementRoute = bodyRoutesSeed.routes.find(
  (route) => route.name === "Movement Training Route"
);

export function getMovementTemplateForDate(date: Date) {
  if (!movementRoute || !("weekly_template" in movementRoute) || !movementRoute.weekly_template) {
    return null;
  }

  const dayName = dayNames[getUtcDayOfWeek(date)];
  return movementRoute.weekly_template.find((item) => item.day === dayName) ?? null;
}

export function formatMovementTrainingMethod(date: Date) {
  const template = getMovementTemplateForDate(date);
  if (!template) return "按低强度恢复训练执行。";

  return `${template.theme}: ${template.structure.join("；")}`;
}
