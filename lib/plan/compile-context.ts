import type { ExecutionLog, Resource, SkillNode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { compileRouteContext, type CompiledRouteContext } from "@/lib/routes/compile-route-context";
import coreFrameworkSeed from "@/seed/core-framework.seed.json";
import dailyTemplateSeed from "@/seed/daily-template.seed.json";
import resourcesSeed from "@/seed/resources.seed.json";
import skillTreeSeed from "@/seed/skill-tree.seed.json";
import aiOutputSchemasSeed from "@/seed/ai-output-schemas.seed.json";

type CoreFrameworkSeed = typeof coreFrameworkSeed;
type DailyTemplateSeed = typeof dailyTemplateSeed;
type AiOutputSchemasSeed = typeof aiOutputSchemasSeed;

export type PlannerResource = Pick<
  Resource,
  | "id"
  | "name"
  | "url"
  | "language"
  | "price"
  | "learningDepth"
  | "practicality"
  | "jobMatch"
  | "completionThreshold"
  | "replacementRisk"
  | "tags"
  | "phase"
  | "accessChannel"
  | "status"
>;

export type PlannerSkillNode = Pick<
  SkillNode,
  | "id"
  | "parentId"
  | "name"
  | "domain"
  | "currentLevel"
  | "targetLevel"
  | "evidenceRequired"
  | "description"
  | "sortOrder"
>;

export type PlannerContext = {
  coreFramework: CoreFrameworkSeed;
  anchors: CoreFrameworkSeed["daily_anchor_points"];
  requiredDomains: CoreFrameworkSeed["daily_required_domains"];
  dailyTemplate: DailyTemplateSeed;
  resources: PlannerResource[];
  skillNodes: PlannerSkillNode[];
  executionLogs: Array<ExecutionLog & { planBlock?: { domain: string; title: string } | null }>;
  outputSchemas: AiOutputSchemasSeed;
  routeContext: CompiledRouteContext;
};

function mapSeedResource(resource: (typeof resourcesSeed)[number]): PlannerResource {
  return {
    id: resource.id,
    name: resource.name,
    url: resource.url,
    language: resource.language,
    price: resource.price,
    learningDepth: resource.learning_depth,
    practicality: resource.practicality,
    jobMatch: resource.job_match,
    completionThreshold: resource.completion_threshold,
    replacementRisk: resource.replacement_risk,
    tags: resource.tags,
    phase: resource.phase,
    accessChannel: resource.access_channel,
    status: "SEED"
  };
}

function mapSeedSkillNodes(): PlannerSkillNode[] {
  return [
    {
      id: skillTreeSeed.root.id,
      parentId: null,
      name: skillTreeSeed.root.name,
      domain: "root",
      currentLevel: skillTreeSeed.root.current_level,
      targetLevel: skillTreeSeed.root.target_level,
      evidenceRequired: ["Top-level life system evidence"],
      description: null,
      sortOrder: 0
    },
    ...skillTreeSeed.nodes.map((node, index) => ({
      id: node.id,
      parentId: node.parent_id,
      name: node.name,
      domain: node.domain,
      currentLevel: node.current_level,
      targetLevel: node.target_level,
      evidenceRequired: node.evidence_required,
      description: null,
      sortOrder: index + 1
    }))
  ];
}

export async function compilePlannerContext(userId: string, date = new Date()): Promise<PlannerContext> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [
    coreFramework,
    resources,
    skillNodes,
    dailyTemplateSetting,
    outputSchemasSetting,
    executionLogs,
    routeContext
  ] = await Promise.all([
    prisma.coreFramework.findFirst({
      where: { isActive: true },
      include: { anchors: { orderBy: { sortOrder: "asc" } } }
    }),
    prisma.resource.findMany({
      where: { status: { in: ["SEED", "ACTIVE", "REVIEW"] } },
      orderBy: [{ jobMatch: "desc" }, { name: "asc" }]
    }),
    prisma.skillNode.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    }),
    prisma.systemSetting.findUnique({ where: { key: "daily_template" } }),
    prisma.systemSetting.findUnique({ where: { key: "ai_output_schemas" } }),
    prisma.executionLog.findMany({
      where: {
        userId,
        createdAt: { gte: sevenDaysAgo }
      },
      include: {
        planBlock: {
          select: {
            domain: true,
            title: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 120
    }),
    compileRouteContext(userId, date)
  ]);

  const coreContent = (coreFramework?.content as CoreFrameworkSeed | undefined) ?? coreFrameworkSeed;

  return {
    coreFramework: coreContent,
    anchors:
      coreFramework?.anchors.map((anchor) => ({
        id: anchor.code,
        time: anchor.time,
        name: anchor.name,
        required: anchor.required,
        definition_of_done: anchor.definitionDone
      })) ?? coreFrameworkSeed.daily_anchor_points,
    requiredDomains: coreContent.daily_required_domains,
    dailyTemplate:
      (dailyTemplateSetting?.value as DailyTemplateSeed | undefined) ?? dailyTemplateSeed,
    resources: resources.length > 0 ? resources : resourcesSeed.map(mapSeedResource),
    skillNodes: skillNodes.length > 0 ? skillNodes : mapSeedSkillNodes(),
    executionLogs,
    outputSchemas:
      (outputSchemasSetting?.value as AiOutputSchemasSeed | undefined) ?? aiOutputSchemasSeed,
    routeContext
  };
}

export function summarizePlannerContext(context: PlannerContext) {
  return {
    anchors: context.anchors,
    required_domains: context.requiredDomains,
    mainline_priority: context.coreFramework.mainline_priority,
    overload_rules: context.coreFramework.overload_rules,
    daily_template_slots: context.dailyTemplate.slots,
    active_skill_nodes: context.skillNodes.map((node) => ({
      id: node.id,
      parent_id: node.parentId,
      name: node.name,
      domain: node.domain,
      current_level: node.currentLevel,
      target_level: node.targetLevel,
      evidence_required: node.evidenceRequired
    })),
    relevant_resources: context.resources.slice(0, 48).map((resource) => ({
      id: resource.id,
      name: resource.name,
      tags: resource.tags,
      phase: resource.phase,
      job_match: resource.jobMatch,
      completion_threshold: resource.completionThreshold
    })),
    recent_execution_logs: context.executionLogs.map((log) => ({
      status: log.status,
      energy: log.energy,
      focus: log.focus,
      note: log.note,
      artifact_url: log.artifactUrl,
      block: log.planBlock
    })),
    route_context: context.routeContext
  };
}
