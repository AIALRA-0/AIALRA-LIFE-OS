import { NextRequest } from "next/server";
import { AgentRunStatus, PlanStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { requireUserProfile, authErrorResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { compilePlannerContext } from "@/lib/plan/compile-context";
import { buildPlannerPrompt, buildResearchPrompt } from "@/lib/plan/prompt";
import {
  buildFallbackDailyPlan,
  generateStructuredPlanWithOpenAI,
  hasOpenAIKey,
  startDeepResearch
} from "@/lib/openai";
import {
  validatePlan,
  type GeneratedDailyPlan
} from "@/lib/plan/validate-plan";
import { parseJsonBody, redactSecrets } from "@/lib/utils/json";
import { toDateAtUtcMidnight } from "@/lib/utils/time";

export const dynamic = "force-dynamic";

const GeneratePlanSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mustDo: z.string().min(1),
  temporaryItems: z.string().optional().default(""),
  specialNeeds: z.string().optional().default(""),
  sleepQuality: z.coerce.number().int().min(1).max(5).optional(),
  weightKg: z.coerce.number().positive().optional(),
  painLevel: z.coerce.number().int().min(0).max(5).optional(),
  energy: z.coerce.number().int().min(1).max(5).optional(),
  focus: z.coerce.number().int().min(1).max(5).optional(),
  anxiety: z.coerce.number().int().min(0).max(5).optional(),
  urgeRisk: z.coerce.number().int().min(0).max(5).optional(),
  requiresResearch: z.coerce.boolean().default(false)
});

async function persistPlan(
  userId: string,
  dailyInputId: string,
  date: Date,
  plan: GeneratedDailyPlan,
  createdBy: string
) {
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
      aiSummary: `由 ${createdBy} 生成。`,
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

export async function POST(request: NextRequest) {
  try {
    const user = await requireUserProfile();
    const payload = await parseJsonBody(request, GeneratePlanSchema);
    const date = toDateAtUtcMidnight(payload.date);

    const dailyInput = await prisma.dailyInput.create({
      data: {
        userId: user.id,
        date,
        mustDo: payload.mustDo,
        temporaryItems: payload.temporaryItems,
        specialNeeds: payload.specialNeeds,
        bodyStatus: {
          sleepQuality: payload.sleepQuality,
          weightKg: payload.weightKg,
          painLevel: payload.painLevel,
          energy: payload.energy
        },
        mentalStatus: {
          focus: payload.focus,
          anxiety: payload.anxiety,
          urgeRisk: payload.urgeRisk
        }
      }
    });

    const context = await compilePlannerContext(user.id);
    const prompt = buildPlannerPrompt(dailyInput, context);
    const validationOptions = {
      requiredAnchorCodes: context.anchors.map((anchor) => anchor.id),
      requiredDomains: context.requiredDomains,
      validResourceIds: new Set(context.resources.map((resource) => resource.id)),
      validSkillNodeIds: new Set(context.skillNodes.map((skill) => skill.id))
    };

    const agentRun = await prisma.agentRun.create({
      data: {
        runType: payload.requiresResearch ? "ResearchAgent" : "PlannerAgent",
        model: payload.requiresResearch ? "o3-deep-research" : process.env.OPENAI_PLANNER_MODEL ?? "gpt-4.1",
        status: AgentRunStatus.RUNNING,
        inputJson: redactSecrets({ payload, prompt }) as Prisma.InputJsonValue,
        startedAt: new Date()
      }
    });

    let plan: GeneratedDailyPlan;
    let createdBy = "openai";
    let fallback = false;
    let validation = { ok: false, errors: ["Plan not generated."] };

    if (payload.requiresResearch) {
      if (hasOpenAIKey()) {
        const research = await startDeepResearch(buildResearchPrompt(dailyInput, context));
        await prisma.agentRun.update({
          where: { id: agentRun.id },
          data: {
            model: research.model,
            status: AgentRunStatus.RUNNING,
            openaiResponseId: research.responseId,
            outputText: research.outputText,
            outputJson: JSON.parse(
              JSON.stringify(redactSecrets(research.raw))
            ) as Prisma.InputJsonValue,
            error: research.error
          }
        });
      } else {
        await prisma.agentRun.update({
          where: { id: agentRun.id },
          data: {
            status: AgentRunStatus.FAILED,
            error: "缺少 OPENAI_API_KEY，无法启动 Deep Research。",
            completedAt: new Date()
          }
        });
      }

      plan = buildFallbackDailyPlan(dailyInput, context, "Deep Research 正在后台处理；当前先启用兜底计划。");
      createdBy = "deep-research-pending-fallback";
      fallback = true;
    } else if (hasOpenAIKey()) {
      try {
        const generated = await generateStructuredPlanWithOpenAI(prompt);
        plan = generated.plan;
        validation = validatePlan(plan, validationOptions);

        await prisma.agentRun.update({
          where: { id: agentRun.id },
          data: {
            status: validation.ok ? AgentRunStatus.COMPLETED : AgentRunStatus.FAILED,
            openaiResponseId: generated.responseId,
            outputJson: plan as Prisma.InputJsonValue,
            error: validation.ok ? null : validation.errors.join("\n"),
            completedAt: new Date()
          }
        });

        if (!validation.ok) {
          plan = buildFallbackDailyPlan(
            dailyInput,
            context,
            `OpenAI plan failed validation: ${validation.errors.join("; ")}`
          );
          createdBy = "validation-fallback";
          fallback = true;
        }
      } catch (error) {
        plan = buildFallbackDailyPlan(
          dailyInput,
          context,
          error instanceof Error ? error.message : "OpenAI generation failed."
        );
        createdBy = "openai-error-fallback";
        fallback = true;

        await prisma.agentRun.update({
          where: { id: agentRun.id },
          data: {
            status: AgentRunStatus.FAILED,
            error: error instanceof Error ? error.message : String(error),
            completedAt: new Date()
          }
        });
      }
    } else {
      plan = buildFallbackDailyPlan(dailyInput, context, "缺少 OPENAI_API_KEY。");
      createdBy = "local-fallback";
      fallback = true;

      await prisma.agentRun.update({
        where: { id: agentRun.id },
        data: {
          status: AgentRunStatus.COMPLETED,
          outputJson: plan as Prisma.InputJsonValue,
          completedAt: new Date()
        }
      });
    }

    validation = validatePlan(plan, validationOptions);
    if (!validation.ok) {
      await prisma.agentRun.update({
        where: { id: agentRun.id },
        data: {
          status: AgentRunStatus.FAILED,
          error: validation.errors.join("\n"),
          completedAt: new Date()
        }
      });

      return Response.json(
        {
          dailyPlanId: null,
          status: "FAILED",
          validation,
          fallback
        },
        { status: 422 }
      );
    }

    const savedPlan = await persistPlan(user.id, dailyInput.id, date, plan, createdBy);
    await prisma.agentRun.update({
      where: { id: agentRun.id },
      data: {
        dailyPlanId: savedPlan.id,
        outputJson: plan as Prisma.InputJsonValue,
        completedAt: payload.requiresResearch ? null : new Date()
      }
    });

    return Response.json({
      dailyPlanId: savedPlan.id,
      status: savedPlan.status,
      validation,
      agentRunId: agentRun.id,
      fallback
    });
  } catch (error) {
    try {
      return authErrorResponse(error);
    } catch (inner) {
      return Response.json(
        { error: inner instanceof Error ? inner.message : String(inner) },
        { status: 500 }
      );
    }
  }
}
