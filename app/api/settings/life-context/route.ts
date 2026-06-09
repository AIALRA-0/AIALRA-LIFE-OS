import { requireUserProfile, authErrorResponse } from "@/lib/auth";
import {
  getLifeContext,
  LifeContextSchema,
  saveLifeContext
} from "@/lib/life-context";
import { parseJsonBody } from "@/lib/utils/json";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireUserProfile();
    const context = await getLifeContext();
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

export async function POST(request: Request) {
  try {
    await requireUserProfile();
    const payload = await parseJsonBody(request, LifeContextSchema);
    await saveLifeContext(payload);
    return Response.json({ ok: true, context: payload });
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
