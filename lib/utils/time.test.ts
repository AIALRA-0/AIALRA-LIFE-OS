import { describe, expect, it } from "vitest";
import {
  buildHalfHourSlots,
  calculateCompletionRate,
  minutesToTime,
  timeToMinutes
} from "@/lib/utils/time";

describe("time utilities", () => {
  it("converts between HH:mm and minutes", () => {
    expect(timeToMinutes("03:30")).toBe(210);
    expect(minutesToTime(20 * 60)).toBe("20:00");
  });

  it("builds the 03:00-20:00 half-hour template", () => {
    const slots = buildHalfHourSlots();
    expect(slots).toHaveLength(34);
    expect(slots[0]).toEqual({ start: "03:00", end: "03:30" });
    expect(slots[33]).toEqual({ start: "19:30", end: "20:00" });
  });

  it("scores partial completion", () => {
    expect(calculateCompletionRate(["COMPLETED", "PARTIAL", "MISSED"])).toBe(0.5);
  });
});
