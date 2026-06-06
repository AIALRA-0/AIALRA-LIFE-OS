import { requireUserProfile, authErrorResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUserProfile();
    const runs = await prisma.agentRun.findMany({
      where: {
        OR: [
          { dailyPlan: { userId: user.id } },
          { dailyPlanId: null }
        ]
      },
      orderBy: { createdAt: "desc" },
      take: 80
    });

    return Response.json({ runs });
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
