import Link from "next/link";
import { Dumbbell, Landmark, Music, Cpu } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AnchorStrip, type AnchorStatus } from "@/components/anchor-strip";
import { AgentRunPanel } from "@/components/agent-run-panel";
import { RiskFlagBadge } from "@/components/risk-flag-badge";
import { TodayTimeline } from "@/components/today-timeline";
import { zhSlotState } from "@/lib/i18n";
import { requirePageUser } from "@/lib/page-auth";
import { prisma } from "@/lib/prisma";
import { calculateCompletionRate, dateOnly, getCurrentPlanSlot, toDateAtUtcMidnight } from "@/lib/utils/time";
import coreFrameworkSeed from "@/seed/core-framework.seed.json";

export const dynamic = "force-dynamic";

function toTimelineBlocks(plan: NonNullable<Awaited<ReturnType<typeof loadDashboardData>>["plan"]>) {
  return plan.blocks.map((block) => ({
    id: block.id,
    startTime: block.startTime,
    endTime: block.endTime,
    domain: block.domain,
    title: block.title,
    method: block.method,
    expectedOutput: block.expectedOutput,
    difficulty: block.difficulty,
    status: block.status,
    resources: block.resources.map((link) => ({
      id: link.resource.id,
      name: link.resource.name
    })),
    skills: block.skills.map((link) => ({
      id: link.skillNode.id,
      name: link.skillNode.name
    }))
  }));
}

async function loadDashboardData(userId: string) {
  const today = toDateAtUtcMidnight(dateOnly());
  const [plan, framework, skills, agentRuns] = await Promise.all([
    prisma.dailyPlan.findFirst({
      where: { userId, date: today, status: { in: ["ACTIVE", "DRAFT", "COMPLETED"] } },
      include: {
        blocks: {
          orderBy: { sortOrder: "asc" },
          include: {
            resources: { include: { resource: true } },
            skills: { include: { skillNode: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.coreFramework.findFirst({
      where: { isActive: true },
      include: { anchors: { orderBy: { sortOrder: "asc" } } }
    }),
    prisma.skillNode.findMany({
      orderBy: { currentLevel: "desc" },
      take: 6,
      include: { _count: { select: { evidence: true } } }
    }),
    prisma.agentRun.findMany({
      where: { dailyPlan: { userId } },
      orderBy: { createdAt: "desc" },
      take: 5
    })
  ]);

  return { plan, framework, skills, agentRuns };
}

function statusForDomain(blocks: Array<{ domain: string; status: string }>, aliases: string[]) {
  const matched = blocks.filter((block) =>
    aliases.some((alias) => block.domain.toLowerCase().includes(alias))
  );
  const done = matched.filter((block) => block.status === "COMPLETED").length;
  return { total: matched.length, done };
}

export default async function DashboardPage() {
  const user = await requirePageUser();
  const { plan, framework, skills, agentRuns } = await loadDashboardData(user.id);
  const currentSlot = getCurrentPlanSlot();
  const blocks = plan ? toTimelineBlocks(plan) : [];
  const completionRate = calculateCompletionRate(blocks.map((block) => block.status));
  const anchorSource =
    framework?.anchors.map((anchor) => ({
      code: anchor.code,
      name: anchor.name,
      time: anchor.time
    })) ??
    coreFrameworkSeed.daily_anchor_points.map((anchor) => ({
      code: anchor.id,
      name: anchor.name,
      time: anchor.time
    }));
  const anchors: AnchorStatus[] = anchorSource.map((anchor) => ({
    ...anchor,
    done: blocks.some(
      (block) =>
        (block.startTime === anchor.time || block.endTime === anchor.time) &&
        block.status === "COMPLETED"
    )
  }));

  const domainStats = [
    { label: "身体/饮食", icon: Dumbbell, data: statusForDomain(blocks, ["health", "diet", "meal"]) },
    { label: "艺术训练", icon: Music, data: statusForDomain(blocks, ["vocal", "dance", "music"]) },
    { label: "商业表达", icon: Landmark, data: statusForDomain(blocks, ["business"]) },
    { label: "芯片/EDA", icon: Cpu, data: statusForDomain(blocks, ["chip_eda", "eda"]) }
  ];

  return (
    <AppShell
      title="总览"
      subtitle="今天的执行状态、锚点、主线产出和风险信号。"
      dateLabel={dateOnly()}
      rightPanel={
        <div className="space-y-6">
          <AnchorStrip anchors={anchors} />
          <div>
            <h2 className="mb-3 text-sm font-semibold text-white">Agent 运行记录</h2>
            <AgentRunPanel
              runs={agentRuns.map((run) => ({
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
          </div>
        </div>
      }
    >
      <div className="grid gap-5">
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="rounded border border-white/10 bg-white/[0.035] p-5">
            <div className="flex flex-wrap items-center gap-3">
              <RiskFlagBadge level={plan?.riskLevel ?? "normal"} />
              <span className="font-mono text-xs text-muted-foreground">
                当前时间块：{currentSlot.state === "active" ? `${currentSlot.slot?.start}-${currentSlot.slot?.end}` : zhSlotState(currentSlot.state)}
              </span>
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-white">
              {plan?.dayTheme ?? "今天还没有计划"}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {plan
                ? plan.aiSummary
                : "先导入初始数据，再填写今天的状态和临时事项，生成半小时执行计划。"}
            </p>
            {!plan ? (
              <Link
                href="/plan/new"
                className="mt-5 inline-flex h-10 items-center rounded bg-primary px-4 text-sm font-medium text-primary-foreground"
              >
                生成今天计划
              </Link>
            ) : null}
          </div>
          <div className="rounded border border-white/10 bg-white/[0.035] p-5">
            <div className="text-xs text-muted-foreground">完成率</div>
            <div className="mt-4 text-5xl font-semibold text-white">
              {(completionRate * 100).toFixed(0)}%
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded bg-white/10">
              <div className="h-full rounded bg-primary" style={{ width: `${completionRate * 100}%` }} />
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-4">
          {domainStats.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded border border-white/10 bg-white/[0.035] p-4">
                <Icon className="h-4 w-4 text-primary" />
                <div className="mt-3 text-sm font-medium text-white">{item.label}</div>
                <div className="mt-1 font-mono text-xs text-muted-foreground">
                  {item.data.done}/{item.data.total} 已完成
                </div>
              </div>
            );
          })}
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">今日时间线</h2>
              <Link href="/plan/today" className="text-sm text-primary">
                打开完整计划
              </Link>
            </div>
            {blocks.length > 0 ? (
              <TodayTimeline blocks={blocks.slice(0, 10)} interactive={false} />
            ) : (
              <div className="rounded border border-white/10 bg-white/[0.035] p-5 text-sm text-muted-foreground">
                还没有计划块。
              </div>
            )}
          </div>
          <div className="rounded border border-white/10 bg-white/[0.035] p-4">
            <h2 className="text-sm font-semibold text-white">技能树摘要</h2>
            <div className="mt-3 grid gap-3">
              {skills.map((skill) => (
                <div key={skill.id}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-white">{skill.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {skill.currentLevel.toFixed(1)}/{skill.targetLevel.toFixed(0)}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded bg-white/10">
                    <div
                      className="h-full rounded bg-accent"
                      style={{ width: `${Math.min(100, (skill.currentLevel / skill.targetLevel) * 100)}%` }}
                    />
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                    证据 {skill._count.evidence}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
