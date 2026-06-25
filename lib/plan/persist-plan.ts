import { PlanStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { GeneratedDailyPlan } from "@/lib/plan/validate-plan";

export async function persistGeneratedPlan({
  userId,
  dailyInputId,
  date,
  plan,
  createdBy,
  aiSummary,
  routeSnapshotJson
}: {
  userId: string;
  dailyInputId: string;
  date: Date;
  plan: GeneratedDailyPlan;
  createdBy: string;
  aiSummary?: string;
  routeSnapshotJson?: unknown;
}) {
  const [
    dbResources,
    dbSkills,
    dbRoutes,
    dbStages,
    dbWeeks,
    dbFixedSlots,
    dbCourseSlots,
    dbOpenAgentSlots
  ] = await Promise.all([
    prisma.resource.findMany({ select: { id: true } }),
    prisma.skillNode.findMany({ select: { id: true } }),
    prisma.cognitiveRoute.findMany({ where: { userId }, select: { id: true } }),
    prisma.routeStage.findMany({ select: { id: true } }),
    prisma.routeWeek.findMany({ select: { id: true } }),
    prisma.fixedTimeSlotTemplate.findMany({ where: { userId }, select: { id: true } }),
    prisma.courseSlot.findMany({ where: { userId }, select: { id: true } }),
    prisma.openAgentSlot.findMany({ where: { userId }, select: { id: true } })
  ]);
  const dbResourceIds = new Set(dbResources.map((resource) => resource.id));
  const dbSkillIds = new Set(dbSkills.map((skill) => skill.id));
  const dbRouteIds = new Set(dbRoutes.map((route) => route.id));
  const dbStageIds = new Set(dbStages.map((stage) => stage.id));
  const dbWeekIds = new Set(dbWeeks.map((week) => week.id));
  const dbFixedSlotIds = new Set(dbFixedSlots.map((slot) => slot.id));
  const dbCourseSlotIds = new Set(dbCourseSlots.map((slot) => slot.id));
  const dbOpenAgentSlotIds = new Set(dbOpenAgentSlots.map((slot) => slot.id));

  await prisma.dailyPlan.updateMany({
    where: {
      userId,
      date,
      status: { in: [PlanStatus.ACTIVE, PlanStatus.DRAFT] }
    },
    data: { status: PlanStatus.ARCHIVED }
  });

  return prisma.dailyPlan.create({
    data: {
      userId,
      dailyInputId,
      date,
      timezone: plan.timezone,
      title: plan.day_theme,
      dayTheme: plan.day_theme,
      riskLevel: plan.risk_level,
      status: PlanStatus.ACTIVE,
      aiSummary: aiSummary ?? `由 ${createdBy} 生成。`,
      planJson: plan as Prisma.InputJsonValue,
      routeSnapshotJson: routeSnapshotJson
        ? (JSON.parse(JSON.stringify(routeSnapshotJson)) as Prisma.InputJsonValue)
        : undefined,
      rescuePlanJson: plan.rescue_plan as Prisma.InputJsonValue,
      successCriteria: plan.success_criteria,
      createdBy,
      blocks: {
        create: plan.blocks.map((block, index) => ({
          startTime: block.start,
          endTime: block.end,
          domain: block.domain,
          title: block.title,
          method: block.method,
          expectedOutput: block.expected_output,
          difficulty: block.difficulty,
          checkinRequired: block.checkin_required,
          routeId: block.route_id && dbRouteIds.has(block.route_id) ? block.route_id : null,
          routeStageId:
            block.route_stage_id && dbStageIds.has(block.route_stage_id)
              ? block.route_stage_id
              : null,
          routeWeekId:
            block.route_week_id && dbWeekIds.has(block.route_week_id) ? block.route_week_id : null,
          fixedSlotTemplateId:
            block.fixed_slot_template_id && dbFixedSlotIds.has(block.fixed_slot_template_id)
              ? block.fixed_slot_template_id
              : null,
          courseSlotId:
            block.course_slot_id && dbCourseSlotIds.has(block.course_slot_id)
              ? block.course_slot_id
              : null,
          openAgentSlotId:
            block.open_agent_slot_id && dbOpenAgentSlotIds.has(block.open_agent_slot_id)
              ? block.open_agent_slot_id
              : null,
          protected: block.protected ?? false,
          flexible: block.flexible ?? true,
          routeTopic: block.route_topic ?? null,
          slotSource: block.slot_source ?? null,
          sortOrder: index,
          resources: {
            create: block.resource_ids
              .filter((resourceId) => dbResourceIds.has(resourceId))
              .map((resourceId) => ({
                resource: { connect: { id: resourceId } }
              }))
          },
          skills: {
            create: block.skill_node_ids
              .filter((skillNodeId) => dbSkillIds.has(skillNodeId))
              .map((skillNodeId) => ({
                skillNode: { connect: { id: skillNodeId } }
              }))
          }
        }))
      }
    }
  });
}
