import { z } from "zod";
import { normalizeSlotRange } from "@/lib/routes/fixed-slots";

export const CourseSlotInputSchema = z.object({
  courseName: z.string().min(1),
  courseCode: z.string().min(1),
  instructor: z.string().optional().default(""),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  location: z.string().optional().default(""),
  term: z.string().optional().default(""),
  source: z.string().optional().default("manual"),
  locked: z.coerce.boolean().default(true),
  active: z.coerce.boolean().default(true)
});

export type CourseSlotInput = z.infer<typeof CourseSlotInputSchema>;

export function validateCourseSlotRange(input: Pick<CourseSlotInput, "startTime" | "endTime">) {
  return normalizeSlotRange(input.startTime, input.endTime);
}
