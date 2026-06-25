import { AgentRunStatus, OpenAgentSlotSource, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { slotsOverlap } from "@/lib/routes/fixed-slots";
import { toDateAtUtcMidnight } from "@/lib/utils/time";

export const RepairPlanInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  insertedTitle: z.string().min(1),
  reason: z.string().min(1),
  source: z.nativeEnum(OpenAgentSlotSource).default(OpenAgentSlotSource.USER_CONFLICT)
});

export type RepairPlanInput = z.infer<typeof RepairPlanInputSchema>;

export async function repairTodayPlan({
  userId,
  input
}: {
  userId: string;
  input: RepairPlanInput;
}) {
  const date = toDateAtUtcMidnight(input.date);
  const plan = await prisma.dailyPlan.findFirst({
    where: {
      userId,
      date,
      status: { in: ["ACTIVE", "DRAFT"] }
    },
    include: {
      blocks: { orderBy: { sortOrder: "asc" } }
    },
    orderBy: { createdAt: "desc" }
  });

  if (!plan) {
    throw new Error("今天还没有可修复的计划。");
  }

  const impactedBlocks = plan.blocks.filter((block) =>
    slotsOverlap(
      { startTime: block.startTime, endTime: block.endTime },
      { startTime: input.startTime, endTime: input.endTime }
    )
  );

  const protectedBlocks = impactedBlocks.filter((block) => block.protected || !block.flexible);
  const flexibleBlocks = impactedBlocks.filter((block) => !block.protected && block.flexible);

  if (flexibleBlocks.length === 0) {
    const protectedList = protectedBlocks
      .map((block) => `${block.startTime}-${block.endTime} ${block.title}`)
      .join("；");
    throw new Error(
      protectedList
        ? `该时间段只命中受保护 block，不能自动改动：${protectedList}`
        : "该时间段没有可修复的 block。"
    );
  }

  const agentRun = await prisma.agentRun.create({
    data: {
      dailyPlanId: plan.id,
      runType: "RepairPlan",
      model: "deterministic-route-repair-v1",
      promptVersion: "repair_plan_v1",
      status: AgentRunStatus.RUNNING,
      inputJson: {
        input,
        impactedBlocks: impactedBlocks.map((block) => ({
          id: block.id,
          startTime: block.startTime,
          endTime: block.endTime,
          title: block.title,
          protected: block.protected,
          flexible: block.flexible
        }))
      } as Prisma.InputJsonValue,
      startedAt: new Date()
    }
  });

  const result = await prisma.$transaction(async (tx) => {
    const openAgentSlot = await tx.openAgentSlot.create({
      data: {
        userId,
        date,
        startTime: input.startTime,
        endTime: input.endTime,
        insertedTitle: input.insertedTitle,
        reason: input.reason,
        source: input.source
      }
    });

    const repairedBlocks = [];
    for (const block of flexibleBlocks) {
      const repaired = await tx.planBlock.update({
        where: { id: block.id },
        data: {
          domain: "open_agent",
          title: input.insertedTitle,
          method: `处理今日变动：${input.reason}`,
          expectedOutput: "完成变动处理，并记录是否影响后续路线。",
          difficulty: Math.min(block.difficulty, 3),
          status: "PLANNED",
          openAgentSlotId: openAgentSlot.id,
          slotSource: "repair",
          repairReason: input.reason,
          resources: { deleteMany: {} },
          skills: { deleteMany: {} }
        }
      });
      repairedBlocks.push(repaired);
    }

    await tx.auditEvent.create({
      data: {
        userId,
        eventType: "plan.repair",
        entityType: "DailyPlan",
        entityId: plan.id,
        payload: {
          input,
          openAgentSlotId: openAgentSlot.id,
          repairedBlockIds: repairedBlocks.map((block) => block.id),
          protectedBlockIds: protectedBlocks.map((block) => block.id)
        }
      }
    });

    return {
      openAgentSlot,
      repairedBlocks
    };
  });

  await prisma.agentRun.update({
    where: { id: agentRun.id },
    data: {
      status: AgentRunStatus.COMPLETED,
      outputJson: {
        openAgentSlotId: result.openAgentSlot.id,
        repairedBlockIds: result.repairedBlocks.map((block) => block.id),
        protectedBlockIds: protectedBlocks.map((block) => block.id)
      } as Prisma.InputJsonValue,
      completedAt: new Date()
    }
  });

  return {
    dailyPlanId: plan.id,
    agentRunId: agentRun.id,
    openAgentSlotId: result.openAgentSlot.id,
    repairedBlockIds: result.repairedBlocks.map((block) => block.id),
    protectedBlocks: protectedBlocks.map((block) => ({
      id: block.id,
      startTime: block.startTime,
      endTime: block.endTime,
      title: block.title
    }))
  };
}
