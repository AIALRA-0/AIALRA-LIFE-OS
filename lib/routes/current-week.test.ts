import { describe, expect, it } from "vitest";
import { getRouteWeekIndex, getUtcDayOfWeek } from "@/lib/routes/current-week";

describe("route current week", () => {
  it("returns week 1 on the route start date", () => {
    const result = getRouteWeekIndex({
      routeStartDate: new Date("2026-06-25T00:00:00.000Z"),
      targetDate: new Date("2026-06-25T23:00:00.000Z"),
      totalWeeks: 18
    });

    expect(result.weekIndex).toBe(1);
    expect(result.started).toBe(true);
    expect(result.completed).toBe(false);
  });

  it("clamps after the route has ended", () => {
    const result = getRouteWeekIndex({
      routeStartDate: new Date("2026-06-25T00:00:00.000Z"),
      targetDate: new Date("2026-09-01T00:00:00.000Z"),
      totalWeeks: 4
    });

    expect(result.weekIndex).toBe(4);
    expect(result.completed).toBe(true);
  });

  it("uses UTC day of week", () => {
    expect(getUtcDayOfWeek(new Date("2026-06-25T03:00:00.000Z"))).toBe(4);
  });
});
