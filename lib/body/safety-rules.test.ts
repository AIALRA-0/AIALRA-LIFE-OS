import { describe, expect, it } from "vitest";
import { evaluateBodySafety, shouldDowngradeMovement } from "@/lib/body/safety-rules";

describe("body safety rules", () => {
  it("keeps normal training when signals are stable", () => {
    const decision = evaluateBodySafety({
      painLevel: 1,
      fatigue: 2,
      energy: 4,
      anxiety: 1,
      urgeRisk: 1
    });

    expect(decision.rescueMode).toBe(false);
  });

  it("downgrades on high pain or low energy", () => {
    expect(shouldDowngradeMovement({ painLevel: 4, energy: 4 })).toBe(true);
    expect(shouldDowngradeMovement({ painLevel: 1, energy: 2 })).toBe(true);
  });

  it("downgrades when pain rises after training", () => {
    const decision = evaluateBodySafety({ painBefore: 1, painAfter: 3, energy: 4 });

    expect(decision.rescueMode).toBe(true);
    expect(decision.reasons.join(" ")).toContain("训练后疼痛明显升高");
  });
});
