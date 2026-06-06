import { prisma } from "@/lib/prisma";

export async function recomputeSkillsFromEvidence(userId: string) {
  const logs = await prisma.executionLog.findMany({
    where: {
      userId,
      status: { in: ["COMPLETED", "PARTIAL"] }
    },
    include: {
      planBlock: {
        include: {
          skills: true,
          resources: true
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 250
  });

  let evidenceCreated = 0;
  const skillDeltas = new Map<string, number>();

  for (const log of logs) {
    if (!log.planBlock || !log.note.trim()) continue;

    const delta = log.status === "COMPLETED" ? 0.05 : 0.02;
    for (const skillLink of log.planBlock.skills) {
      const existing = await prisma.skillEvidence.findFirst({
        where: {
          userId,
          skillNodeId: skillLink.skillNodeId,
          title: `Execution evidence: ${log.planBlock.title}`,
          evidenceDate: log.createdAt
        }
      });

      if (existing) continue;

      await prisma.skillEvidence.create({
        data: {
          userId,
          skillNodeId: skillLink.skillNodeId,
          resourceId: log.planBlock.resources[0]?.resourceId,
          title: `Execution evidence: ${log.planBlock.title}`,
          description: log.note,
          artifactUrl: log.artifactUrl,
          delta,
          confidence: log.status === "COMPLETED" ? 0.72 : 0.48,
          evidenceDate: log.createdAt
        }
      });

      evidenceCreated += 1;
      skillDeltas.set(skillLink.skillNodeId, (skillDeltas.get(skillLink.skillNodeId) ?? 0) + delta);
    }
  }

  for (const [skillNodeId, delta] of skillDeltas.entries()) {
    const skill = await prisma.skillNode.findUnique({ where: { id: skillNodeId } });
    if (!skill) continue;

    await prisma.skillNode.update({
      where: { id: skillNodeId },
      data: {
        currentLevel: Math.min(skill.targetLevel, skill.currentLevel + delta)
      }
    });
  }

  return {
    evidenceCreated,
    updatedSkills: skillDeltas.size
  };
}
