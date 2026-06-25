export type RouteWeekWindow = {
  weekIndex: number;
  totalWeeks: number;
  started: boolean;
  completed: boolean;
  daysSinceStart: number;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function getRouteWeekIndex({
  routeStartDate,
  targetDate,
  totalWeeks
}: {
  routeStartDate: Date;
  targetDate: Date;
  totalWeeks: number;
}): RouteWeekWindow {
  const start = startOfUtcDay(routeStartDate);
  const target = startOfUtcDay(targetDate);
  const daysSinceStart = Math.floor((target.getTime() - start.getTime()) / MS_PER_DAY);
  const rawWeekIndex = Math.floor(Math.max(daysSinceStart, 0) / 7) + 1;
  const boundedTotalWeeks = Math.max(totalWeeks, 1);
  const weekIndex = Math.min(rawWeekIndex, boundedTotalWeeks);

  return {
    weekIndex,
    totalWeeks: boundedTotalWeeks,
    started: daysSinceStart >= 0,
    completed: rawWeekIndex > boundedTotalWeeks,
    daysSinceStart
  };
}

export function getUtcDayOfWeek(date: Date) {
  return startOfUtcDay(date).getUTCDay();
}
