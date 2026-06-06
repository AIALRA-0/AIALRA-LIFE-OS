import { NextRequest } from "next/server";
import { PlanStatus } from "@prisma/client";
import { requireUserProfile, authErrorResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dateOnly, toDateAtUtcMidnight } from "@/lib/utils/time";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUserProfile();
    const dateParam = request.nextUrl.searchParams.get("date") ?? dateOnly();
    const date = toDateAtUtcMidnight(dateParam);

    const plan = await prisma.dailyPlan.findFirst({
      where: {
        userId: user.id,
        date,
        status: { in: [PlanStatus.ACTIVE, PlanStatus.COMPLETED, PlanStatus.DRAFT] }
      },
      include: {
        blocks: {
          orderBy: { sortOrder: "asc" },
          include: {
            resources: { include: { resource: true } },
            skills: { include: { skillNode: true } },
            executionLogs: { orderBy: { createdAt: "desc" }, take: 1 }
          }
        },
        agentRuns: { orderBy: { createdAt: "desc" }, take: 5 }
      },
      orderBy: { createdAt: "desc" }
    });

    if (!plan) {
      return Response.json({ plan: null }, { status: 404 });
    }

    return Response.json({ plan });
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
