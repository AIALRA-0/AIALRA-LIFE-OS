import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { RouteCard } from "@/components/route-card";
import { requirePageUser } from "@/lib/page-auth";
import { prisma } from "@/lib/prisma";
import { compileRouteContext } from "@/lib/routes/compile-route-context";
import { dateOnly, toDateAtUtcMidnight } from "@/lib/utils/time";

export const dynamic = "force-dynamic";

export default async function RoutesPage() {
  const user = await requirePageUser();
  const today = toDateAtUtcMidnight(dateOnly());
  const context = await compileRouteContext(user.id, today);
  const counts = await prisma.cognitiveRoute.groupBy({
    by: ["domain"],
    where: { userId: user.id },
    _count: { _all: true }
  });

  return (
    <AppShell
      title="认知路线"
      subtitle="确定性路线、阶段、周主题和证据节点。"
      rightPanel={
        <div className="space-y-4">
          <div className="rounded border border-white/10 bg-white/[0.035] p-4">
            <h2 className="text-sm font-semibold text-white">路线分布</h2>
            <dl className="mt-3 grid gap-2 text-sm">
              {counts.map((item) => (
                <div key={item.domain} className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{item.domain}</dt>
                  <dd className="font-mono text-primary">{item._count._all}</dd>
                </div>
              ))}
            </dl>
          </div>
          <Link
            href="/routes/current"
            className="inline-flex h-10 w-full items-center justify-center rounded bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            查看今日路线
          </Link>
        </div>
      }
    >
      <div className="grid gap-4">
        {context.routes.length === 0 ? (
          <section className="rounded border border-white/10 bg-white/[0.035] p-6">
            <h2 className="text-xl font-semibold text-white">还没有导入认知路线</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              执行 seed:routes 和 seed:body-routes 后，这里会显示主线、支线和身体路线。
            </p>
          </section>
        ) : (
          context.routes.map((route) => <RouteCard key={route.id} route={route} />)
        )}
      </div>
    </AppShell>
  );
}
