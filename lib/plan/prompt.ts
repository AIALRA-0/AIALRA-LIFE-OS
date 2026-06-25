import type { DailyInput } from "@prisma/client";
import type { PlannerContext } from "@/lib/plan/compile-context";
import { compactJson } from "@/lib/utils/json";

export function buildPlannerPrompt(input: DailyInput, context: PlannerContext) {
  return [
    "You are PlannerAgent for Aialra Life OS.",
    "",
    "Non-negotiable rules:",
    "- Wake time is 03:00 and sleep time is 20:00. Never schedule after 20:00.",
    "- Every plan block must be exactly 30 minutes or a multiple of 30 minutes aligned to HH:00/HH:30.",
    "- Daily domains must appear: health, diet, vocal, dance, music, chip_eda, ai_agent, business, external_feedback, review.",
    "- Chip/EDA is the highest priority mainline. AI agent work is an accelerator and must not swallow the mainline.",
    "- Use route_context.fixedSlots as the day skeleton. Protected slots must not be moved or replaced.",
    "- Use route_context.routes currentWeek/currentStage to choose today's topics. Do not invent a new life route.",
    "- 03:30-04:00 must use Body Activation Route. 07:00-08:00 must use Movement Training Route or its rescue version.",
    "- If energy/focus is low, pain is high, or anxiety/urge risk is high, produce a low-intensity rescue plan.",
    "- Every block must include a verifiable expected_output.",
    "- User-facing text must be written in Simplified Chinese: day_theme, block title, method, expected_output, rescue_plan, success_criteria.",
    "- Use resource_ids and skill_node_ids only from the provided context.",
    "- Return JSON only, matching daily_plan_schema exactly.",
    "",
    "Daily input:",
    compactJson({
      date: input.date.toISOString().slice(0, 10),
      mustDo: input.mustDo,
      temporaryItems: input.temporaryItems,
      specialNeeds: input.specialNeeds,
      bodyStatus: input.bodyStatus,
      mentalStatus: input.mentalStatus,
      availableWindows: input.availableWindows
    }),
    "",
    "Planner context:",
    compactJson({
      core_framework: {
        hard_constraints: context.coreFramework.hard_constraints,
        daily_anchor_points: context.anchors,
        daily_required_domains: context.requiredDomains,
        mainline_priority: context.coreFramework.mainline_priority,
        side_track_rules: context.coreFramework.side_track_rules,
        overload_rules: context.coreFramework.overload_rules
      },
      daily_template: context.dailyTemplate,
      skill_nodes: context.skillNodes.map((node) => ({
        id: node.id,
        parent_id: node.parentId,
        name: node.name,
        domain: node.domain,
        current_level: node.currentLevel,
        target_level: node.targetLevel,
        evidence_required: node.evidenceRequired
      })),
      resources: context.resources.map((resource) => ({
        id: resource.id,
        name: resource.name,
        tags: resource.tags,
        phase: resource.phase,
        job_match: resource.jobMatch,
        completion_threshold: resource.completionThreshold
      })),
      recent_execution_logs: context.executionLogs.slice(0, 40).map((log) => ({
        status: log.status,
        energy: log.energy,
        focus: log.focus,
        note: log.note,
        artifact_url: log.artifactUrl,
        block: log.planBlock
      })),
      route_context: context.routeContext
    })
  ].join("\n");
}

export function buildResearchPrompt(input: DailyInput, context: PlannerContext) {
  return [
    "Run source-backed research for today's Aialra Life OS planning context.",
    "Focus on resources, learning sequence, and concrete deliverables for Chip/EDA first.",
    "Return practical recommendations in Simplified Chinese that can be converted into a 03:00-20:00 execution plan.",
    "",
    buildPlannerPrompt(input, context)
  ].join("\n");
}
