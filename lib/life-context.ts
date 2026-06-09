import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const LIFE_CONTEXT_KEY = "life_context";

export const LifeContextSchema = z.object({
  personalBackground: z.string().optional().default(""),
  longTermPlan: z.string().optional().default(""),
  currentStrategy: z.string().optional().default("")
});

export type LifeContext = z.infer<typeof LifeContextSchema>;

export const emptyLifeContext: LifeContext = {
  personalBackground: "",
  longTermPlan: "",
  currentStrategy: ""
};

export async function getLifeContext(): Promise<LifeContext> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: LIFE_CONTEXT_KEY }
  });

  if (!setting?.value) {
    return emptyLifeContext;
  }

  const parsed = LifeContextSchema.safeParse(setting.value);
  return parsed.success ? parsed.data : emptyLifeContext;
}

export async function saveLifeContext(context: LifeContext) {
  return prisma.systemSetting.upsert({
    where: { key: LIFE_CONTEXT_KEY },
    update: { value: context },
    create: { key: LIFE_CONTEXT_KEY, value: context }
  });
}
