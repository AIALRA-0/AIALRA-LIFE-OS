import { NextRequest } from "next/server";
import { AgentRunStatus, Prisma } from "@prisma/client";
import { requireUserProfile, authErrorResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { compilePlannerContext } from "@/lib/plan/compile-context";
import { DailyPlanInputSchema } from "@/lib/plan/input-schema";
import { persistGeneratedPlan } from "@/lib/plan/persist-plan";
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

export async function POST(request: NextRequest) {
  try {
    const user = await requireUserProfile();
    const payload = await parseJsonBody(request, DailyPlanInputSchema);
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
        },
        availableWindows: {
          externalMessageSummary: payload.externalMessageSummary
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

    const savedPlan = await persistGeneratedPlan({
      userId: user.id,
      dailyInputId: dailyInput.id,
      date,
      plan,
      createdBy
    });
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
