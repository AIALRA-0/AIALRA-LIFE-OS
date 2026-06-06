import { describe, expect, it } from "vitest";
import { buildHalfHourSlots } from "@/lib/utils/time";
import { validatePlan } from "@/lib/plan/validate-plan";

function basePlan() {
  return {
    date: "2026-06-04",
    timezone: "America/New_York",
    day_theme: "Mainline proof",
    risk_level: "normal",
    anchors: Array.from({ length: 8 }, (_, index) => ({
      anchor_id: `A${index}`,
      time: index === 7 ? "20:00" : "03:00",
      status: "planned",
      definition_of_done: "done"
    })),
    blocks: buildHalfHourSlots().map((slot, index) => ({
      start: slot.start,
      end: slot.end,
      domain:
        index < 2
          ? "health"
          : index < 4
            ? "diet"
            : index < 6
              ? "vocal"
              : index < 8
                ? "dance"
                : index < 10
                  ? "music"
                  : index < 20
                    ? "chip_eda"
                    : index < 23
                      ? "ai_agent"
                      : index < 26
                        ? "business"
                        : index < 28
                          ? "external_feedback"
                          : "review",
      title: "block",
      method: "method",
      expected_output: "artifact",
      skill_node_ids: [],
      resource_ids: [],
      difficulty: 3,
      checkin_required: true
    })),
    rescue_plan: {
      trigger: "low energy",
      minimum_actions: ["walk", "ship one technical artifact"]
    },
    success_criteria: ["sleep at 20:00"],
    agent_tasks: []
  };
}

describe("validatePlan", () => {
  it("accepts a contiguous half-hour plan", () => {
    const result = validatePlan(basePlan(), {
      requiredAnchorCodes: ["A0", "A7"],
      requiredDomains: [
        { id: "health", minimum_minutes: 30 },
        { id: "chip_eda", minimum_minutes: 180 }
      ]
    });

    expect(result.ok).toBe(true);
  });

  it("rejects blocks after 20:00", () => {
    const plan = basePlan();
    plan.blocks[plan.blocks.length - 1].end = "20:30";

    const result = validatePlan(plan);

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("20:00");
  });
});
