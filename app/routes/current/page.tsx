import { AppShell } from "@/components/app-shell";
import { BodyRoutesPanel } from "@/components/body-routes-panel";
import { CodexSidecarTaskPanel } from "@/components/codex-sidecar-task-panel";
import { CourseSlotForm } from "@/components/course-slot-form";
import { CurrentRouteBoard } from "@/components/current-route-board";
import { FixedSlotGrid } from "@/components/fixed-slot-grid";
import { RepairPlanForm } from "@/components/repair-plan-form";
import { requirePageUser } from "@/lib/page-auth";
import { prisma } from "@/lib/prisma";
import { compileRouteContext } from "@/lib/routes/compile-route-context";
import { dateOnly, toDateAtUtcMidnight } from "@/lib/utils/time";

export const dynamic = "force-dynamic";

export default async function CurrentRoutesPage({
  searchParams
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const user = await requirePageUser();
  const params = await searchParams;
  const dateParam = params.date ?? dateOnly();
  const date = toDateAtUtcMidnight(dateParam);
  const [context, tasks] = await Promise.all([
    compileRouteContext(user.id, date),
    prisma.codexSidecarTask.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 8
    })
  ]);

  return (
    <AppShell
      title="今日路线"
      subtitle="今天不是重新规划人生，而是执行当前周路线、课程槽和开放插槽。"
      dateLabel={dateParam}
      rightPanel={
        <div className="space-y-4">
          <BodyRoutesPanel date={date} />
          <CourseSlotForm />
          <RepairPlanForm date={dateParam} />
          <CodexSidecarTaskPanel
            tasks={tasks.map((task) => ({
              id: task.id,
              title: task.title,
              status: task.status,
              outputSummary: task.outputSummary,
              artifactUrl: task.artifactUrl
            }))}
          />
        </div>
      }
    >
      <div className="space-y-5">
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-white">固定时间片</h2>
            <span className="font-mono text-xs text-muted-foreground">
              {context.fixedSlots.length} slots
            </span>
          </div>
          <FixedSlotGrid slots={context.fixedSlots} />
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-white">当前路线周</h2>
            <span className="font-mono text-xs text-muted-foreground">
              {context.routes.length} routes
            </span>
          </div>
          <CurrentRouteBoard routes={context.routes} />
        </section>
      </div>
    </AppShell>
  );
}
