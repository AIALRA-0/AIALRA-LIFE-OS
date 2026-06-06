import { NextRequest } from "next/server";
import { AgentRunStatus, PlanStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { requireUserProfile, authErrorResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildDailyReviewPrompt } from "@/lib/review/prompt";
import { generateTextWithOpenAI, hasOpenAIKey } from "@/lib/openai";
import { recomputeSkillsFromEvidence } from "@/lib/skills/recompute";
import { parseJsonBody, redactSecrets } from "@/lib/utils/json";
import { calculateCompletionRate, toDateAtUtcMidnight } from "@/lib/utils/time";

export const dynamic = "force-dynamic";

const DailyReviewSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mode: z.enum(["generate", "generate_and_save"]).default("generate_and_save")
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireUserProfile();
    const payload = await parseJsonBody(request, DailyReviewSchema);
    const date = toDateAtUtcMidnight(payload.date);

    const plan = await prisma.dailyPlan.findFirst({
      where: {
        userId: user.id,
        date,
        status: { in: [PlanStatus.ACTIVE, PlanStatus.COMPLETED, PlanStatus.DRAFT] }
      },
      include: {
        blocks: { orderBy: { sortOrder: "asc" } }
      },
      orderBy: { createdAt: "desc" }
    });

    if (!plan) {
      return Response.json({ error: "这一天还没有计划，无法生成日结。" }, { status: 404 });
    }

    const logs = await prisma.executionLog.findMany({
      where: {
        userId: user.id,
        planBlockId: { in: plan.blocks.map((block) => block.id) }
      },
      orderBy: { createdAt: "asc" }
    });

    const completionRate = calculateCompletionRate(plan.blocks.map((block) => block.status));
    const riskFlags = [
      completionRate < 0.5 ? "完成率低于50%" : null,
      logs.some((log) => log.energy <= 2) ? "记录到低能量" : null,
      logs.some((log) => log.urgeTrigger) ? "记录到冲动/过载触发点" : null
    ].filter(Boolean) as string[];

    const skillUpdates = await recomputeSkillsFromEvidence(user.id);
    let summary = [
      `完成率：${(completionRate * 100).toFixed(0)}%。`,
      `新建技能证据：${skillUpdates.evidenceCreated} 条。`,
      riskFlags.length > 0 ? `风险标记：${riskFlags.join("、")}。` : "今天没有记录到重大风险标记。"
    ].join(" ");

    const prompt = buildDailyReviewPrompt(plan, logs);
    const agentRun = await prisma.agentRun.create({
      data: {
        dailyPlanId: plan.id,
        runType: "ReviewAgent",
        model: process.env.OPENAI_REVIEW_MODEL ?? "gpt-4.1",
        status: AgentRunStatus.RUNNING,
        inputJson: redactSecrets({ payload, prompt }) as Prisma.InputJsonValue,
        startedAt: new Date()
      }
    });

    if (hasOpenAIKey()) {
      try {
        const ai = await generateTextWithOpenAI(prompt, process.env.OPENAI_REVIEW_MODEL ?? "gpt-4.1");
        summary = ai.outputText || summary;
        await prisma.agentRun.update({
          where: { id: agentRun.id },
          data: {
            status: AgentRunStatus.COMPLETED,
            openaiResponseId: ai.responseId,
            outputText: summary,
            completedAt: new Date()
          }
        });
      } catch (error) {
        await prisma.agentRun.update({
          where: { id: agentRun.id },
          data: {
            status: AgentRunStatus.FAILED,
            error: error instanceof Error ? error.message : String(error),
            outputText: summary,
            completedAt: new Date()
          }
        });
      }
    } else {
      await prisma.agentRun.update({
        where: { id: agentRun.id },
        data: {
          status: AgentRunStatus.COMPLETED,
          outputText: summary,
          completedAt: new Date()
        }
      });
    }

    if (payload.mode === "generate_and_save") {
      await prisma.journalEntry.create({
        data: {
          userId: user.id,
          date,
          entryType: "daily_review",
          title: `${payload.date} 日结复盘`,
          content: summary,
          tags: ["daily-review", plan.riskLevel]
        }
      });

      await prisma.dailyPlan.update({
        where: { id: plan.id },
        data: { status: PlanStatus.COMPLETED }
      });
    }

    return Response.json({
      summary,
      completionRate,
      skillUpdates,
      riskFlags,
      tomorrowFocus: [
        "保护 03:00 起床和 20:00 睡觉。",
        "从最小的芯片/EDA可见产出开始。",
        "AI Agent 工作必须绑定到主线加速。"
      ]
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
