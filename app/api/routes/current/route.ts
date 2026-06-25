import { NextRequest } from "next/server";
import { authErrorResponse, requireUserProfile } from "@/lib/auth";
import { compileRouteContext } from "@/lib/routes/compile-route-context";
import { dateOnly, toDateAtUtcMidnight } from "@/lib/utils/time";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUserProfile();
    const date = toDateAtUtcMidnight(request.nextUrl.searchParams.get("date") ?? dateOnly());
    const context = await compileRouteContext(user.id, date);
    return Response.json({ context });
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
