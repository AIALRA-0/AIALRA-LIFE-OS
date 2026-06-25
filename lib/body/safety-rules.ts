export type BodySafetyInput = {
  painLevel?: number | null;
  painBefore?: number | null;
  painAfter?: number | null;
  fatigue?: number | null;
  fatigueAfter?: number | null;
  energy?: number | null;
  anxiety?: number | null;
  urgeRisk?: number | null;
};

export type BodySafetyDecision = {
  rescueMode: boolean;
  reasons: string[];
  movementPlan: string[];
  activationPlan: string[];
};

const DEFAULT_MOVEMENT_RESCUE = [
  "20-30 分钟轻松步行",
  "10 分钟髋 / 踝 / 肩轻 mobility",
  "不做跑步间歇",
  "不做最大力量训练"
];

const DEFAULT_ACTIVATION_RESCUE = [
  "90/90 breathing",
  "cat-cow",
  "glute bridge",
  "3-minute easy walk"
];

export function evaluateBodySafety(input: BodySafetyInput): BodySafetyDecision {
  const reasons: string[] = [];
  const pain = input.painAfter ?? input.painBefore ?? input.painLevel ?? 0;
  const fatigue = input.fatigueAfter ?? input.fatigue ?? 0;
  const energy = input.energy ?? 3;
  const anxiety = input.anxiety ?? 0;
  const urgeRisk = input.urgeRisk ?? 0;

  if (pain >= 4) reasons.push("疼痛评分 >= 4");
  if (fatigue >= 4) reasons.push("疲劳评分 >= 4");
  if (energy <= 2) reasons.push("能量 <= 2");
  if (anxiety >= 4) reasons.push("焦虑 >= 4");
  if (urgeRisk >= 4) reasons.push("冲动/分心风险 >= 4");
  if (
    typeof input.painBefore === "number" &&
    typeof input.painAfter === "number" &&
    input.painAfter > input.painBefore + 1
  ) {
    reasons.push("训练后疼痛明显升高");
  }

  return {
    rescueMode: reasons.length > 0,
    reasons,
    movementPlan: DEFAULT_MOVEMENT_RESCUE,
    activationPlan: DEFAULT_ACTIVATION_RESCUE
  };
}

export function shouldDowngradeMovement(input: BodySafetyInput) {
  return evaluateBodySafety(input).rescueMode;
}
