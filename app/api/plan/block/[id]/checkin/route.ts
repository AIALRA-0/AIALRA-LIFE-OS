import { NextRequest } from "next/server";
import { BlockStatus } from "@prisma/client";
import { z } from "zod";
import { requireUserProfile, authErrorResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseJsonBody } from "@/lib/utils/json";

export const dynamic = "force-dynamic";

const CheckinSchema = z.object({
  status: z.nativeEnum(BlockStatus),
  actualStart: z.string().datetime().optional().nullable(),
  actualEnd: z.string().datetime().optional().nullable(),
  energy: z.coerce.number().int().min(1).max(5).default(3),
  focus: z.coerce.number().int().min(1).max(5).default(3),
  urgeTrigger: z.string().optional().nullable(),
  note: z.string().optional().default(""),
  artifactUrl: z.string().url().optional().or(z.literal("")).nullable()
});

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
        dailyPlan: true
      }
    });

    if (!block) {
      return Response.json({ error: "Plan block not found." }, { status: 404 });
    }

    const actualStart = payload.actualStart ? new Date(payload.actualStart) : null;
    const actualEnd = payload.actualEnd ? new Date(payload.actualEnd) : null;

    await prisma.executionLog.create({
      data: {
        userId: user.id,
        planBlockId: block.id,
        status: payload.status,
        actualStart,
        actualEnd,
        energy: payload.energy,
        focus: payload.focus,
        urgeTrigger: payload.urgeTrigger,
        note: payload.note,
        artifactUrl: payload.artifactUrl || null,
        rawJson: payload
      }
    });

    await prisma.planBlock.update({
      where: { id: block.id },
      data: {
        status: payload.status,
        actualStart,
        actualEnd
      }
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
