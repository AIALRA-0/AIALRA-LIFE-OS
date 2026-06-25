import { NextRequest } from "next/server";
import { authErrorResponse, requireUserProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CourseSlotInputSchema, validateCourseSlotRange } from "@/lib/routes/course-slots";
import { parseJsonBody } from "@/lib/utils/json";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUserProfile();
    const active = request.nextUrl.searchParams.get("active");
    const courseSlots = await prisma.courseSlot.findMany({
      where: {
        userId: user.id,
        active: active === null ? undefined : active !== "false"
      },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }]
    });
    return Response.json({ courseSlots });
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
    const payload = await parseJsonBody(request, CourseSlotInputSchema);
    validateCourseSlotRange(payload);

    const courseSlot = await prisma.courseSlot.create({
      data: {
        userId: user.id,
        courseName: payload.courseName,
        courseCode: payload.courseCode,
        instructor: payload.instructor || null,
        dayOfWeek: payload.dayOfWeek,
        startTime: payload.startTime,
        endTime: payload.endTime,
        location: payload.location || null,
        term: payload.term || null,
        source: payload.source || "manual",
        locked: payload.locked,
        active: payload.active
      }
    });

    await prisma.auditEvent.create({
      data: {
        userId: user.id,
        eventType: "course_slot.create",
        entityType: "CourseSlot",
        entityId: courseSlot.id,
        payload: courseSlot
      }
    });

    return Response.json({ courseSlot });
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
