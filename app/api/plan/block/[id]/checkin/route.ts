import { NextRequest } from "next/server";
import { BlockStatus, BodyCheckinType, Prisma } from "@prisma/client";
import { z } from "zod";
import { requireUserProfile, authErrorResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseJsonBody } from "@/lib/utils/json";

export const dynamic = "force-dynamic";

const CheckinSchema = z.object({
  status: z.nativeEnum(BlockStatus),
  actualStart: z.string().optional().nullable(),
  actualEnd: z.string().optional().nullable(),
  actualMinutes: z.coerce.number().int().min(0).max(1020).optional().nullable(),
  energy: z.coerce.number().int().min(1).max(5).default(3),
  focus: z.coerce.number().int().min(1).max(5).default(3),
  painOrFatigue: z.coerce.number().int().min(0).max(5).optional().nullable(),
  distractionLevel: z.coerce.number().int().min(0).max(5).optional().nullable(),
  urgeTrigger: z.string().optional().nullable(),
  note: z.string().optional().default(""),
  artifactUrl: z.string().url().optional().or(z.literal("")).nullable(),
  painBefore: z.coerce.number().int().min(0).max(5).optional().nullable(),
  painAfter: z.coerce.number().int().min(0).max(5).optional().nullable(),
  stiffnessBefore: z.coerce.number().int().min(0).max(5).optional().nullable(),
  stiffnessAfter: z.coerce.number().int().min(0).max(5).optional().nullable(),
  hipTightness: z.coerce.number().int().min(0).max(5).optional().nullable(),
  neckShoulderTension: z.coerce.number().int().min(0).max(5).optional().nullable(),
  lumbarSignal: z.coerce.number().int().min(0).max(5).optional().nullable(),
  activationCompleted: z.coerce.boolean().optional().nullable(),
  trainingType: z.string().optional().nullable(),
  durationMinutes: z.coerce.number().int().min(0).max(300).optional().nullable(),
  distanceOrSteps: z.string().optional().nullable(),
  setsCompleted: z.string().optional().nullable(),
  rpe: z.coerce.number().int().min(0).max(10).optional().nullable(),
  fatigueAfter: z.coerce.number().int().min(0).max(5).optional().nullable(),
  zone2Completed: z.coerce.boolean().optional().nullable(),
  strengthCompleted: z.coerce.boolean().optional().nullable(),
  mobilityCompleted: z.coerce.boolean().optional().nullable(),
  evidenceText: z.string().optional().nullable(),
  evidenceUrl: z.string().url().optional().or(z.literal("")).nullable()
});

function parseOptionalDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("实际开始/结束时间格式不正确。");
  }
  return date;
}

function hasBodyPayload(payload: z.infer<typeof CheckinSchema>) {
  return [
    payload.painBefore,
    payload.painAfter,
    payload.stiffnessBefore,
    payload.stiffnessAfter,
    payload.hipTightness,
    payload.neckShoulderTension,
    payload.lumbarSignal,
    payload.activationCompleted,
    payload.trainingType,
    payload.durationMinutes,
    payload.distanceOrSteps,
    payload.setsCompleted,
    payload.rpe,
    payload.fatigueAfter,
    payload.zone2Completed,
    payload.strengthCompleted,
    payload.mobilityCompleted,
    payload.evidenceText,
    payload.evidenceUrl
  ].some((value) => value !== undefined && value !== null && value !== "");
}

function bodyCheckinType(block: {
  domain: string;
  title: string;
  route?: { name: string } | null;
  fixedSlotTemplate?: { slotType: string } | null;
}): BodyCheckinType {
  const marker = `${block.domain} ${block.title} ${block.route?.name ?? ""} ${
    block.fixedSlotTemplate?.slotType ?? ""
  }`.toLowerCase();
  if (marker.includes("movement") || marker.includes("运动训练")) {
    return BodyCheckinType.MOVEMENT_TRAINING;
  }
  if (marker.includes("activation") || marker.includes("身体激活")) {
    return BodyCheckinType.BODY_ACTIVATION;
  }
  if (marker.includes("diet") || marker.includes("meal") || marker.includes("餐")) {
    return BodyCheckinType.DIET;
  }
  return BodyCheckinType.GENERAL;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUserProfile();
    const { id } = await params;
    const payload = await parseJsonBody(request, CheckinSchema);

    const block = await prisma.planBlock.findFirst({
      where: {
        id,
        dailyPlan: { userId: user.id }
      },
      include: {
        dailyPlan: true,
        route: { select: { name: true } },
        fixedSlotTemplate: { select: { slotType: true } }
      }
    });

    if (!block) {
      return Response.json({ error: "Plan block not found." }, { status: 404 });
    }

    const actualStart = parseOptionalDate(payload.actualStart);
    const actualEnd = parseOptionalDate(payload.actualEnd);
    const checkinType = bodyCheckinType(block);

    await prisma.$transaction(async (tx) => {
      const executionLog = await tx.executionLog.create({
        data: {
          userId: user.id,
          planBlockId: block.id,
          status: payload.status,
          actualStart,
          actualEnd,
          actualMinutes: payload.actualMinutes ?? payload.durationMinutes ?? null,
          energy: payload.energy,
          focus: payload.focus,
          painOrFatigue: payload.painOrFatigue ?? payload.fatigueAfter ?? null,
          distractionLevel: payload.distractionLevel ?? null,
          urgeTrigger: payload.urgeTrigger,
          note: payload.note,
          artifactUrl: payload.artifactUrl || payload.evidenceUrl || null,
          rawJson: payload as Prisma.InputJsonValue
        }
      });

      if (hasBodyPayload(payload) || checkinType !== BodyCheckinType.GENERAL) {
        await tx.bodyCheckin.create({
          data: {
            executionLogId: executionLog.id,
            userId: user.id,
            planBlockId: block.id,
            checkinType,
            painBefore: payload.painBefore ?? null,
            painAfter: payload.painAfter ?? null,
            stiffnessBefore: payload.stiffnessBefore ?? null,
            stiffnessAfter: payload.stiffnessAfter ?? null,
            hipTightness: payload.hipTightness ?? null,
            neckShoulderTension: payload.neckShoulderTension ?? null,
            lumbarSignal: payload.lumbarSignal ?? null,
            activationCompleted: payload.activationCompleted ?? null,
            trainingType: payload.trainingType || null,
            durationMinutes: payload.durationMinutes ?? payload.actualMinutes ?? null,
            distanceOrSteps: payload.distanceOrSteps || null,
            setsCompleted: payload.setsCompleted
              ? ({ text: payload.setsCompleted } as Prisma.InputJsonValue)
              : Prisma.JsonNull,
            rpe: payload.rpe ?? null,
            fatigueAfter: payload.fatigueAfter ?? null,
            zone2Completed: payload.zone2Completed ?? null,
            strengthCompleted: payload.strengthCompleted ?? null,
            mobilityCompleted: payload.mobilityCompleted ?? null,
            evidenceText: payload.evidenceText || null,
            evidenceUrl: payload.evidenceUrl || payload.artifactUrl || null
          }
        });
      }

      await tx.planBlock.update({
        where: { id: block.id },
        data: {
          status: payload.status,
          actualStart,
          actualEnd
        }
      });
    });

    const nextBlock = await prisma.planBlock.findFirst({
      where: {
        dailyPlanId: block.dailyPlanId,
        sortOrder: { gt: block.sortOrder }
      },
      orderBy: { sortOrder: "asc" },
      select: { id: true }
    });

    return Response.json({
      ok: true,
      blockStatus: payload.status,
      nextBlockId: nextBlock?.id ?? null
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
