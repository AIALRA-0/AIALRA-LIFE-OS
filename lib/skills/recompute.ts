import { prisma } from "@/lib/prisma";

export async function recomputeSkillsFromEvidence(userId: string) {
  const logs = await prisma.executionLog.findMany({
    where: {
      userId,
      status: { in: ["COMPLETED", "PARTIAL"] }
    },
    include: {
      bodyCheckin: true,
      planBlock: {
        include: {
          skills: true,
          resources: true,
          route: true,
          routeStage: true,
          routeWeek: true
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 250
  });

  let evidenceCreated = 0;
  let routeEvidenceUpdated = 0;
  const skillDeltas = new Map<string, number>();

  for (const log of logs) {
    if (!log.planBlock) continue;

    const delta = log.status === "COMPLETED" ? 0.05 : 0.02;
    const evidenceDescription =
      log.note.trim() ||
      log.bodyCheckin?.evidenceText ||
      [
        log.actualMinutes ? `actualMinutes=${log.actualMinutes}` : null,
        log.bodyCheckin?.checkinType ? `bodyCheckin=${log.bodyCheckin.checkinType}` : null,
        log.bodyCheckin?.rpe ? `rpe=${log.bodyCheckin.rpe}` : null,
        typeof log.bodyCheckin?.painBefore === "number" &&
        typeof log.bodyCheckin?.painAfter === "number"
          ? `pain ${log.bodyCheckin.painBefore}->${log.bodyCheckin.painAfter}`
          : null
      ]
        .filter(Boolean)
        .join("; ");

    const artifactUrl = log.artifactUrl ?? log.bodyCheckin?.evidenceUrl ?? null;

    for (const skillLink of log.planBlock.skills) {
      if (!evidenceDescription.trim()) continue;
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
          description: evidenceDescription,
          artifactUrl,
          delta,
          confidence: log.status === "COMPLETED" ? 0.72 : 0.48,
          evidenceDate: log.createdAt
        }
      });

      evidenceCreated += 1;
      skillDeltas.set(skillLink.skillNodeId, (skillDeltas.get(skillLink.skillNodeId) ?? 0) + delta);
    }

    if (log.planBlock.routeId) {
      const routeNodes = await prisma.routeEvidenceNode.findMany({
        where: {
          userId,
          routeId: log.planBlock.routeId
        },
        take: 8
      });

      for (const node of routeNodes) {
        const confidenceDelta = log.status === "COMPLETED" ? 8 : 4;
        await prisma.routeEvidenceNode.update({
          where: { id: node.id },
          data: {
            currentLevel: Math.min(5, node.currentLevel + (log.status === "COMPLETED" ? 1 : 0)),
            confidence: Math.min(100, node.confidence + confidenceDelta),
            lastEvidenceAt: log.createdAt
          }
        });
        routeEvidenceUpdated += 1;
      }
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
    updatedSkills: skillDeltas.size,
    routeEvidenceUpdated
  };
}
