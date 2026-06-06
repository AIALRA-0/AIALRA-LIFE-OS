import { requireUserProfile, authErrorResponse } from "@/lib/auth";
import { recomputeSkillsFromEvidence } from "@/lib/skills/recompute";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const user = await requireUserProfile();
    const result = await recomputeSkillsFromEvidence(user.id);
    return Response.json({ ok: true, ...result });
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
