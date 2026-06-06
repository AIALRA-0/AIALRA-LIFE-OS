import { AppShell } from "@/components/app-shell";
import { AgentRunPanel } from "@/components/agent-run-panel";
import { requirePageUser } from "@/lib/page-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const user = await requirePageUser();
  const runs = await prisma.agentRun.findMany({
    where: {
      OR: [{ dailyPlan: { userId: user.id } }, { dailyPlanId: null }]
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return (
    <AppShell
      title="Agent 日志"
      subtitle="记录计划、研究、复盘和技能重算的每一次 AI 调用。"
      rightPanel={
        <div className="rounded border border-white/10 bg-white/[0.035] p-4">
          <h2 className="text-sm font-semibold text-white">审计原则</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            每一次 AI 调用都会保存模型、类型、状态、时间、输出摘要和错误信息。
          </p>
        </div>
      }
    >
      <AgentRunPanel
        runs={runs.map((run) => ({
          id: run.id,
          runType: run.runType,
          model: run.model,
          status: run.status,
          createdAt: run.createdAt.toISOString(),
          completedAt: run.completedAt?.toISOString() ?? null,
          error: run.error,
          outputText: run.outputText
        }))}
      />
    </AppShell>
  );
}
