import { z } from "zod";

export const DailyPlanInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mustDo: z.string().min(1),
  temporaryItems: z.string().optional().default(""),
  specialNeeds: z.string().optional().default(""),
  externalMessageSummary: z.string().optional().default(""),
  sleepQuality: z.coerce.number().int().min(1).max(5).optional(),
  weightKg: z.coerce.number().positive().optional(),
  painLevel: z.coerce.number().int().min(0).max(5).optional(),
  energy: z.coerce.number().int().min(1).max(5).optional(),
  focus: z.coerce.number().int().min(1).max(5).optional(),
  anxiety: z.coerce.number().int().min(0).max(5).optional(),
  urgeRisk: z.coerce.number().int().min(0).max(5).optional(),
  requiresResearch: z.coerce.boolean().default(false)
});

export type DailyPlanInputPayload = z.infer<typeof DailyPlanInputSchema>;
