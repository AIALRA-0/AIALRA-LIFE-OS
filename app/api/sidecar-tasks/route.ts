import { NextRequest } from "next/server";
import { CodexSidecarStatus } from "@prisma/client";
import { z } from "zod";
import { authErrorResponse, requireUserProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseJsonBody } from "@/lib/utils/json";

export const dynamic = "force-dynamic";

const SidecarTaskInputSchema = z.object({
  planBlockId: z.string().optional().nullable(),
  routeWeekId: z.string().optional().nullable(),
  title: z.string().min(1),
  prompt: z.string().min(1),
  repoUrl: z.string().url().optional().or(z.literal("")).nullable()
});

export async function GET() {
  try {
    const user = await requireUserProfile();
    const tasks = await prisma.codexSidecarTask.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50
    });
    return Response.json({ tasks });
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

export async function POST(request: NextRequest) {
  try {
    const user = await requireUserProfile();
    const payload = await parseJsonBody(request, SidecarTaskInputSchema);
    const task = await prisma.codexSidecarTask.create({
      data: {
        userId: user.id,
        planBlockId: payload.planBlockId || null,
        routeWeekId: payload.routeWeekId || null,
        title: payload.title,
        prompt: payload.prompt,
        repoUrl: payload.repoUrl || null,
        status: CodexSidecarStatus.QUEUED
      }
    });

    await prisma.auditEvent.create({
      data: {
        userId: user.id,
        eventType: "sidecar_task.create",
        entityType: "CodexSidecarTask",
        entityId: task.id,
        payload: {
          title: task.title,
          routeWeekId: task.routeWeekId,
          planBlockId: task.planBlockId
        }
      }
    });

    return Response.json({ task });
  } catch (error) {
    try {
      return authErrorResponse(error);
    } catch (inner) {
      return Response.json(
        { error: inner instanceof Error ? inner.message : String(inner) },
        { status: 400 }
      );
    }
  }
}
