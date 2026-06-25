import { describe, expect, it } from "vitest";
import { normalizeSlotRange, resolveFixedSlots, slotsOverlap } from "@/lib/routes/fixed-slots";

describe("fixed slots", () => {
  it("detects overlap", () => {
    expect(
      slotsOverlap(
        { startTime: "04:00", endTime: "05:00" },
        { startTime: "04:30", endTime: "05:30" }
      )
    ).toBe(true);
    expect(
      slotsOverlap(
        { startTime: "04:00", endTime: "05:00" },
        { startTime: "05:00", endTime: "05:30" }
      )
    ).toBe(false);
  });

  it("rejects non half-hour ranges", () => {
    expect(() => normalizeSlotRange("04:10", "05:00")).toThrow(/半小时/);
  });

  it("resolves templates, courses, and open agent slots", () => {
    const slots = resolveFixedSlots({
      templates: [
        {
          id: "template-1",
          startTime: "04:00",
          endTime: "05:00",
          title: "主线",
          slotType: "FIXED_ROUTE",
          routeDomain: "Chip/EDA",
          protected: true,
          flexible: false,
          defaultRule: "主线"
        }
      ],
      courseSlots: [
        {
          id: "course-1",
          startTime: "12:00",
          endTime: "13:00",
          courseName: "EDA",
          courseCode: "EE680",
          locked: true
        }
      ],
      openAgentSlots: [
        {
          id: "open-1",
          startTime: "15:00",
          endTime: "15:30",
          insertedTitle: "临时邮件",
          reason: "用户冲突"
        }
      ]
    });

    expect(slots.map((slot) => slot.source)).toEqual(["template", "course", "open_agent"]);
  });
});
