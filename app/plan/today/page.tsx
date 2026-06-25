import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AnchorStrip } from "@/components/anchor-strip";
import { TodayTimeline } from "@/components/today-timeline";
import { RiskFlagBadge } from "@/components/risk-flag-badge";
import { requirePageUser } from "@/lib/page-auth";
import { prisma } from "@/lib/prisma";
import { calculateCompletionRate, dateOnly, toDateAtUtcMidnight } from "@/lib/utils/time";
import coreFrameworkSeed from "@/seed/core-framework.seed.json";

export const dynamic = "force-dynamic";

export default async function TodayPlanPage({
  searchParams
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const user = await requirePageUser();
  const resolvedSearchParams = await searchParams;
  const dateParam = resolvedSearchParams.date ?? dateOnly();
  const date = toDateAtUtcMidnight(dateParam);

  const [plan, framework] = await Promise.all([
    prisma.dailyPlan.findFirst({
      where: { userId: user.id, date, status: { in: ["ACTIVE", "DRAFT", "COMPLETED"] } },
      include: {
        blocks: {
          orderBy: { sortOrder: "asc" },
          include: {
            route: { select: { id: true, name: true, domain: true } },
            routeStage: { select: { id: true, name: true } },
            routeWeek: { select: { id: true, title: true } },
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
    })
  ]);

  const blocks =
    plan?.blocks.map((block) => ({
      id: block.id,
      startTime: block.startTime,
      endTime: block.endTime,
      domain: block.domain,
      title: block.title,
      method: block.method,
      expectedOutput: block.expectedOutput,
      difficulty: block.difficulty,
      status: block.status,
      protected: block.protected,
      flexible: block.flexible,
      routeTopic: block.routeTopic,
      slotSource: block.slotSource,
      route: block.route,
      routeStage: block.routeStage,
      routeWeek: block.routeWeek,
      resources: block.resources.map((link) => ({ id: link.resource.id, name: link.resource.name })),
      skills: block.skills.map((link) => ({ id: link.skillNode.id, name: link.skillNode.name }))
    })) ?? [];

  const anchorSource =
    framework?.anchors.map((anchor) => ({ code: anchor.code, name: anchor.name, time: anchor.time })) ??
    coreFrameworkSeed.daily_anchor_points.map((anchor) => ({ code: anchor.id, name: anchor.name, time: anchor.time }));

  return (
    <AppShell
      title="今日执行"
      subtitle="03:00-20:00 的半小时执行时间线。点击任意计划块打卡。"
      dateLabel={dateParam}
      rightPanel={
        <div className="space-y-6">
          <RiskFlagBadge level={plan?.riskLevel ?? "normal"} />
          <div className="rounded border border-white/10 bg-white/[0.035] p-4">
            <h2 className="text-sm font-semibold text-white">完成率</h2>
            <div className="mt-3 text-4xl font-semibold text-white">
              {(calculateCompletionRate(blocks.map((block) => block.status)) * 100).toFixed(0)}%
            </div>
          </div>
          <AnchorStrip
            anchors={anchorSource.map((anchor) => ({
              ...anchor,
              done: blocks.some(
                (block) =>
                  (block.startTime === anchor.time || block.endTime === anchor.time) &&
                  block.status === "COMPLETED"
              )
            }))}
          />
        </div>
      }
    >
      {plan ? (
        <div className="space-y-4">
          <section className="rounded border border-white/10 bg-white/[0.035] p-4">
            <h2 className="text-xl font-semibold text-white">{plan.dayTheme}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{plan.aiSummary}</p>
          </section>
          <TodayTimeline blocks={blocks} />
        </div>
      ) : (
        <section className="rounded border border-white/10 bg-white/[0.035] p-6">
          <h2 className="text-xl font-semibold text-white">{dateParam} 还没有计划</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            请先根据今天的约束和身体状态生成计划。
          </p>
          <Link
            href="/plan/new"
            className="mt-5 inline-flex h-10 items-center rounded bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            生成计划
          </Link>
        </section>
      )}
    </AppShell>
  );
}
