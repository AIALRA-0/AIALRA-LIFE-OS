import { AppShell } from "@/components/app-shell";
import { SkillTreePanel } from "@/components/skill-tree-panel";
import { requirePageUser } from "@/lib/page-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SkillsPage() {
  await requirePageUser();
  const skills = await prisma.skillNode.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      routeEvidenceNodes: {
        orderBy: [{ updatedAt: "desc" }],
        take: 1
      },
      _count: { select: { evidence: true, routeEvidenceNodes: true } }
    }
  });

  return (
    <AppShell
      title="技能树"
      subtitle="按层级展示当前等级、目标等级和升级所需证据。"
      rightPanel={
        <div className="rounded border border-white/10 bg-white/[0.035] p-4">
          <h2 className="text-sm font-semibold text-white">技能树规则</h2>
          <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
            <li>只有证据能推动等级变化。</li>
            <li>产出物链接优先于模糊备注。</li>
            <li>未完成只记录，不做道德评价。</li>
          </ul>
        </div>
      }
    >
      <SkillTreePanel
        skills={skills.map((skill) => ({
          id: skill.id,
          parentId: skill.parentId,
          name: skill.name,
          domain: skill.domain,
          currentLevel: skill.currentLevel,
          targetLevel: skill.targetLevel,
          evidenceRequired: skill.evidenceRequired,
          evidenceCount: skill._count.evidence,
          routeEvidenceCount: skill._count.routeEvidenceNodes,
          nextGate: skill.routeEvidenceNodes[0]?.nextGate ?? null,
          confidence: skill.routeEvidenceNodes[0]?.confidence ?? null
        }))}
      />
    </AppShell>
  );
}
