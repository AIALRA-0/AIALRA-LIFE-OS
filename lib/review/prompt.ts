import type { DailyPlan, ExecutionLog, PlanBlock } from "@prisma/client";
import { compactJson } from "@/lib/utils/json";

export function buildDailyReviewPrompt(
  plan: DailyPlan & { blocks: PlanBlock[] },
  logs: ExecutionLog[]
) {
  return [
    "You are ReviewAgent for Aialra Life OS.",
    "Generate a concise nightly review in Simplified Chinese and JSON-compatible language.",
    "Assess completion, evidence, skill deltas, risk flags, and tomorrow focus.",
    "Never moralize; produce audit-grade observations and next actions.",
    "",
    compactJson({
      plan: {
        date: plan.date.toISOString().slice(0, 10),
        title: plan.title,
        day_theme: plan.dayTheme,
        risk_level: plan.riskLevel,
        success_criteria: plan.successCriteria,
        blocks: plan.blocks.map((block) => ({
          id: block.id,
          start: block.startTime,
          end: block.endTime,
          domain: block.domain,
          title: block.title,
          expected_output: block.expectedOutput,
          status: block.status
        }))
      },
      logs: logs.map((log) => ({
        plan_block_id: log.planBlockId,
        status: log.status,
        energy: log.energy,
        focus: log.focus,
        urge_trigger: log.urgeTrigger,
        note: log.note,
        artifact_url: log.artifactUrl
      }))
    })
  ].join("\n");
}
