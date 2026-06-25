import { OpenAgentSlotSource } from "@prisma/client";
import { z } from "zod";
import { normalizeSlotRange } from "@/lib/routes/fixed-slots";

export const OpenAgentSlotInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  insertedTitle: z.string().min(1),
  reason: z.string().min(1),
  source: z.nativeEnum(OpenAgentSlotSource).default(OpenAgentSlotSource.USER_CONFLICT)
});

export type OpenAgentSlotInput = z.infer<typeof OpenAgentSlotInputSchema>;

export function validateOpenAgentSlotRange(input: Pick<OpenAgentSlotInput, "startTime" | "endTime">) {
  return normalizeSlotRange(input.startTime, input.endTime);
}
