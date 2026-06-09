import { AgentRunStatus, Prisma } from "@prisma/client";
import { requireUserProfile, authErrorResponse } from "@/lib/auth";
import { getLifeContext } from "@/lib/life-context";
import { prisma } from "@/lib/prisma";
import { compilePlannerContext } from "@/lib/plan/compile-context";
import { DailyPlanInputSchema } from "@/lib/plan/input-schema";
import { buildManualPlannerPromptPackage } from "@/lib/plan/manual-prompt";
import { parseJsonBody, redactSecrets } from "@/lib/utils/json";
import { toDateAtUtcMidnight } from "@/lib/utils/time";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
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

    const [context, lifeContext] = await Promise.all([
      compilePlannerContext(user.id),
      getLifeContext()
    ]);
    const promptPackage = buildManualPlannerPromptPackage({
      dailyInput,
      context,
      lifeContext
    });

    const agentRun = await prisma.agentRun.create({
      data: {
        runType: "ManualPlannerPrompt",
        model: "chatgpt-pro-manual",
        status: AgentRunStatus.RUNNING,
        inputJson: redactSecrets({
          payload,
          lifeContext,
          prompt: promptPackage.prompt
        }) as Prisma.InputJsonValue,
        outputText: "已生成手动 ChatGPT 提示包，等待 JSON 导入。",
        startedAt: new Date()
      }
    });

    return Response.json({
      agentRunId: agentRun.id,
      dailyInputId: dailyInput.id,
      date: payload.date,
      prompt: promptPackage.prompt,
      schema: promptPackage.schema,
      importInstructions: promptPackage.importInstructions
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
