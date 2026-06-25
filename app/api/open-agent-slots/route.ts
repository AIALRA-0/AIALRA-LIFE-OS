import { NextRequest } from "next/server";
import { authErrorResponse, requireUserProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OpenAgentSlotInputSchema, validateOpenAgentSlotRange } from "@/lib/routes/open-agent-slots";
import { parseJsonBody } from "@/lib/utils/json";
import { dateOnly, toDateAtUtcMidnight } from "@/lib/utils/time";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUserProfile();
    const date = toDateAtUtcMidnight(request.nextUrl.searchParams.get("date") ?? dateOnly());
    const openAgentSlots = await prisma.openAgentSlot.findMany({
      where: { userId: user.id, date },
      orderBy: [{ startTime: "asc" }]
    });
    return Response.json({ openAgentSlots });
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
    const payload = await parseJsonBody(request, OpenAgentSlotInputSchema);
    validateOpenAgentSlotRange(payload);
    const date = toDateAtUtcMidnight(payload.date);

    const openAgentSlot = await prisma.openAgentSlot.create({
      data: {
        userId: user.id,
        date,
        startTime: payload.startTime,
        endTime: payload.endTime,
        insertedTitle: payload.insertedTitle,
        reason: payload.reason,
        source: payload.source
      }
    });

    await prisma.auditEvent.create({
      data: {
        userId: user.id,
        eventType: "open_agent_slot.create",
        entityType: "OpenAgentSlot",
        entityId: openAgentSlot.id,
        payload: openAgentSlot
      }
    });

    return Response.json({ openAgentSlot });
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
