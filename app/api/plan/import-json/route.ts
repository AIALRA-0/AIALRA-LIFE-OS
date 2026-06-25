import { AgentRunStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { requireUserProfile, authErrorResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { compilePlannerContext } from "@/lib/plan/compile-context";
import { persistGeneratedPlan } from "@/lib/plan/persist-plan";
import {
  GeneratedDailyPlanSchema,
  validatePlan
} from "@/lib/plan/validate-plan";
import { extractJsonFromText, parseJsonBody, redactSecrets } from "@/lib/utils/json";
import { toDateAtUtcMidnight } from "@/lib/utils/time";

export const dynamic = "force-dynamic";

const ImportPlanSchema = z.object({
  agentRunId: z.string().min(1),
  dailyInputId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  planJson: z.union([z.string(), z.record(z.string(), z.unknown())])
});

export async function POST(request: Request) {
  try {
    const user = await requireUserProfile();
    const payload = await parseJsonBody(request, ImportPlanSchema);
    const date = toDateAtUtcMidnight(payload.date);
    let rawPlan: unknown;
    try {
      rawPlan =
        typeof payload.planJson === "string"
          ? extractJsonFromText(payload.planJson)
          : payload.planJson;
    } catch (parseError) {
      return Response.json(
        { error: parseError instanceof Error ? parseError.message : "无法解析 JSON。" },
        { status: 422 }
      );
    }

    const dailyInput = await prisma.dailyInput.findFirst({
      where: {
        id: payload.dailyInputId,
        userId: user.id,
        date
      }
    });

    if (!dailyInput) {
      return Response.json({ error: "没有找到对应的今日输入，无法导入计划。" }, { status: 404 });
    }

    const parsed = GeneratedDailyPlanSchema.safeParse(rawPlan);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
      await prisma.agentRun.updateMany({
        where: { id: payload.agentRunId },
        data: {
          status: AgentRunStatus.FAILED,
          outputJson: redactSecrets(rawPlan) as Prisma.InputJsonValue,
          error: errors.join("\n"),
          completedAt: new Date()
        }
      });
      return Response.json({ error: "JSON 不符合 daily_plan_schema。", validation: { ok: false, errors } }, { status: 422 });
    }

    const context = await compilePlannerContext(user.id, date);
    const validation = validatePlan(parsed.data, {
      requiredAnchorCodes: context.anchors.map((anchor) => anchor.id),
      requiredDomains: context.requiredDomains,
      validResourceIds: new Set(context.resources.map((resource) => resource.id)),
      validSkillNodeIds: new Set(context.skillNodes.map((skill) => skill.id))
    });

    if (!validation.ok) {
      await prisma.agentRun.updateMany({
        where: { id: payload.agentRunId },
        data: {
          status: AgentRunStatus.FAILED,
          outputJson: redactSecrets(parsed.data) as Prisma.InputJsonValue,
          error: validation.errors.join("\n"),
          completedAt: new Date()
        }
      });
      return Response.json({ error: "计划没有通过 Life OS 规则校验。", validation }, { status: 422 });
    }

    const savedPlan = await persistGeneratedPlan({
      userId: user.id,
      dailyInputId: dailyInput.id,
      date,
      plan: parsed.data,
      createdBy: "chatgpt-pro-manual",
      aiSummary: "由 ChatGPT Pro 手动提示包生成并通过 Life OS 校验。",
      routeSnapshotJson: context.routeContext
    });

    await prisma.agentRun.updateMany({
      where: { id: payload.agentRunId },
      data: {
        dailyPlanId: savedPlan.id,
        status: AgentRunStatus.COMPLETED,
        outputJson: redactSecrets(parsed.data) as Prisma.InputJsonValue,
        outputText: `已导入 ${parsed.data.blocks.length} 个计划块。`,
        error: null,
        completedAt: new Date()
      }
    });

    return Response.json({
      dailyPlanId: savedPlan.id,
      status: savedPlan.status,
      validation,
      agentRunId: payload.agentRunId
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
