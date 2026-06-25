import { NextRequest } from "next/server";
import { authErrorResponse, requireUserProfile } from "@/lib/auth";
import { RepairPlanInputSchema, repairTodayPlan } from "@/lib/routes/repair-plan";
import { normalizeSlotRange } from "@/lib/routes/fixed-slots";
import { parseJsonBody } from "@/lib/utils/json";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUserProfile();
    const payload = await parseJsonBody(request, RepairPlanInputSchema);
    normalizeSlotRange(payload.startTime, payload.endTime);
    const result = await repairTodayPlan({ userId: user.id, input: payload });
    return Response.json(result);
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
