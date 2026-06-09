import { PlanStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { GeneratedDailyPlan } from "@/lib/plan/validate-plan";

export async function persistGeneratedPlan({
  userId,
  dailyInputId,
  date,
  plan,
  createdBy,
  aiSummary
}: {
  userId: string;
  dailyInputId: string;
  date: Date;
  plan: GeneratedDailyPlan;
  createdBy: string;
  aiSummary?: string;
}) {
  const [dbResources, dbSkills] = await Promise.all([
    prisma.resource.findMany({ select: { id: true } }),
    prisma.skillNode.findMany({ select: { id: true } })
  ]);
  const dbResourceIds = new Set(dbResources.map((resource) => resource.id));
  const dbSkillIds = new Set(dbSkills.map((skill) => skill.id));

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
