import { z } from "zod";
import {
  isHalfHourAligned,
  timeToMinutes
} from "@/lib/utils/time";

export const GeneratedAnchorSchema = z.object({
  anchor_id: z.string(),
  time: z.string(),
  status: z.enum(["planned", "completed", "missed", "adjusted"]),
  definition_of_done: z.string()
});

export const GeneratedPlanBlockSchema = z.object({
  start: z.string(),
  end: z.string(),
  domain: z.string(),
  title: z.string(),
  method: z.string(),
  expected_output: z.string(),
  skill_node_ids: z.array(z.string()),
  resource_ids: z.array(z.string()),
  difficulty: z.number().int().min(1).max(5),
  checkin_required: z.boolean()
});

export const GeneratedDailyPlanSchema = z.object({
  date: z.string(),
  timezone: z.string(),
  day_theme: z.string(),
  risk_level: z.enum(["normal", "fatigue", "high_urge", "overloaded", "recovery"]),
  anchors: z.array(GeneratedAnchorSchema),
  blocks: z.array(GeneratedPlanBlockSchema),
  rescue_plan: z.object({
    trigger: z.string(),
    minimum_actions: z.array(z.string())
  }),
  success_criteria: z.array(z.string()),
  agent_tasks: z.array(
    z.object({
      agent: z.string(),
      input: z.string(),
      output: z.string(),
      deadline: z.string(),
      human_review_required: z.boolean()
    })
  )
});

export type GeneratedDailyPlan = z.infer<typeof GeneratedDailyPlanSchema>;
export type GeneratedPlanBlock = z.infer<typeof GeneratedPlanBlockSchema>;

export type RequiredDomain = {
  id: string;
  name?: string;
  minimum_minutes?: number;
};

export type ValidatePlanOptions = {
  requiredAnchorCodes?: string[];
  requiredDomains?: RequiredDomain[];
  validResourceIds?: Set<string>;
  validSkillNodeIds?: Set<string>;
};

export type PlanValidationResult = {
  ok: boolean;
  errors: string[];
};

const DOMAIN_ALIASES: Record<string, string[]> = {
  health: ["health", "body", "training", "运动", "身体"],
  diet: ["diet", "meal", "food", "nutrition", "饮食"],
  vocal: ["vocal", "voice", "singing", "声乐"],
  dance: ["dance", "movement", "舞蹈"],
  music: ["music", "ear", "production", "音乐"],
  chip_eda: ["chip_eda", "eda", "verification", "rtl", "chip", "芯片"],
  ai_agent: ["ai_agent", "agent", "workflow"],
  business: ["business", "finance", "management", "expression", "商业"],
  external_feedback: ["external_feedback", "career", "admin", "feedback"],
  review: ["review", "audit", "shutdown", "复盘"]
};

function domainMatches(domain: string, requiredId: string) {
  const normalized = domain.toLowerCase();
  const aliases = DOMAIN_ALIASES[requiredId] ?? [requiredId];
  return aliases.some((alias) => normalized.includes(alias.toLowerCase()));
}

export function validatePlan(
  input: unknown,
  options: ValidatePlanOptions = {}
): PlanValidationResult {
  const parsed = GeneratedDailyPlanSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    };
  }

  const plan = parsed.data;
  const errors: string[] = [];

  const blockRanges = plan.blocks
    .map((block, index) => {
      let start = 0;
      let end = 0;
      try {
        start = timeToMinutes(block.start);
        end = timeToMinutes(block.end);
      } catch {
        errors.push(`Block ${index + 1} has invalid time ${block.start}-${block.end}.`);
      }
      return { block, index, start, end };
    })
    .sort((a, b) => a.start - b.start);

  if (blockRanges.length === 0) {
    errors.push("Plan must include blocks.");
  } else {
    if (blockRanges[0]?.start !== timeToMinutes("03:00")) {
      errors.push("First block must start at 03:00.");
    }

    if (blockRanges[blockRanges.length - 1]?.end !== timeToMinutes("20:00")) {
      errors.push("Last block must end at 20:00.");
    }
  }

  for (const range of blockRanges) {
    if (!isHalfHourAligned(range.block.start) || !isHalfHourAligned(range.block.end)) {
      errors.push(`Block ${range.index + 1} is not aligned to 30 minutes.`);
    }

    if (range.end <= range.start) {
      errors.push(`Block ${range.index + 1} must end after it starts.`);
    }

    if (range.start < timeToMinutes("03:00") || range.end > timeToMinutes("20:00")) {
      errors.push(`Block ${range.index + 1} is outside 03:00-20:00.`);
    }

    if (!range.block.expected_output.trim()) {
      errors.push(`Block ${range.index + 1} is missing expected_output.`);
    }

    for (const resourceId of range.block.resource_ids) {
      if (options.validResourceIds && !options.validResourceIds.has(resourceId)) {
        errors.push(`Unknown resource_id '${resourceId}' in block ${range.index + 1}.`);
      }
    }

    for (const skillNodeId of range.block.skill_node_ids) {
      if (options.validSkillNodeIds && !options.validSkillNodeIds.has(skillNodeId)) {
        errors.push(`Unknown skill_node_id '${skillNodeId}' in block ${range.index + 1}.`);
      }
    }
  }

  for (let i = 1; i < blockRanges.length; i += 1) {
    const previous = blockRanges[i - 1];
    const current = blockRanges[i];
    if (previous.end !== current.start) {
      errors.push(
        `Blocks must be contiguous; found ${previous.block.end} then ${current.block.start}.`
      );
    }
  }

  const anchorCodes = new Set(plan.anchors.map((anchor) => anchor.anchor_id));
  for (const anchorCode of options.requiredAnchorCodes ?? []) {
    if (!anchorCodes.has(anchorCode)) {
      errors.push(`Missing anchor ${anchorCode}.`);
    }
  }

  for (const requiredDomain of options.requiredDomains ?? []) {
    const minutes = plan.blocks.reduce((sum, block) => {
      if (!domainMatches(block.domain, requiredDomain.id)) {
        return sum;
      }

      return sum + (timeToMinutes(block.end) - timeToMinutes(block.start));
    }, 0);

    const minimum = requiredDomain.minimum_minutes ?? 1;
    if (minutes < minimum) {
      errors.push(
        `Required domain '${requiredDomain.id}' has ${minutes} minutes; minimum is ${minimum}.`
      );
    }
  }

  if (plan.rescue_plan.minimum_actions.length === 0) {
    errors.push("rescue_plan.minimum_actions must not be empty.");
  }

  return {
    ok: errors.length === 0,
    errors
  };
}
