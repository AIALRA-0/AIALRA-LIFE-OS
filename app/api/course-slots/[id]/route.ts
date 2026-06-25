import { NextRequest } from "next/server";
import { z } from "zod";
import { authErrorResponse, requireUserProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CourseSlotInputSchema, validateCourseSlotRange } from "@/lib/routes/course-slots";
import { parseJsonBody } from "@/lib/utils/json";

export const dynamic = "force-dynamic";

const CourseSlotPatchSchema = CourseSlotInputSchema.partial().extend({
  active: z.coerce.boolean().optional()
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUserProfile();
    const { id } = await params;
    const payload = await parseJsonBody(request, CourseSlotPatchSchema);

    if (payload.startTime && payload.endTime) {
      validateCourseSlotRange({ startTime: payload.startTime, endTime: payload.endTime });
    }

    const existing = await prisma.courseSlot.findFirst({ where: { id, userId: user.id } });
    if (!existing) return Response.json({ error: "课程槽不存在。" }, { status: 404 });

    const courseSlot = await prisma.courseSlot.update({
      where: { id },
      data: {
        courseName: payload.courseName,
        courseCode: payload.courseCode,
        instructor: payload.instructor,
        dayOfWeek: payload.dayOfWeek,
        startTime: payload.startTime,
        endTime: payload.endTime,
        location: payload.location,
        term: payload.term,
        source: payload.source,
        locked: payload.locked,
        active: payload.active
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUserProfile();
    const { id } = await params;
    const existing = await prisma.courseSlot.findFirst({ where: { id, userId: user.id } });
    if (!existing) return Response.json({ error: "课程槽不存在。" }, { status: 404 });

    const courseSlot = await prisma.courseSlot.update({
      where: { id },
      data: { active: false }
    });

    return Response.json({ courseSlot });
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
