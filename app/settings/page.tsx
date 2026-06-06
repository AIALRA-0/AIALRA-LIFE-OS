import { AppShell } from "@/components/app-shell";
import { SeedImportButton } from "@/components/seed-import-button";
import { requirePageUser } from "@/lib/page-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requirePageUser();
  const [resources, skills, anchors] = await Promise.all([
    prisma.resource.count(),
    prisma.skillNode.count(),
    prisma.anchor.count()
  ]);

  const envRows = [
    ["DATABASE_URL", Boolean(process.env.DATABASE_URL)],
    ["DIRECT_URL", Boolean(process.env.DIRECT_URL)],
    ["NEXT_PUBLIC_SUPABASE_URL", Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)],
    ["NEXT_PUBLIC_SUPABASE_ANON_KEY", Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)],
    ["SUPABASE_SERVICE_ROLE_KEY", Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)],
    ["OPENAI_API_KEY", Boolean(process.env.OPENAI_API_KEY)]
  ] as const;

  return (
    <AppShell
      title="设置"
      subtitle="查看初始数据、环境变量状态和当前部署目标。"
      rightPanel={
        <div className="rounded border border-white/10 bg-white/[0.035] p-4">
          <h2 className="text-sm font-semibold text-white">当前登录</h2>
          <p className="mt-2 break-all font-mono text-xs text-muted-foreground">{user.email}</p>
        </div>
      }
    >
      <div className="space-y-4">
        <section className="grid gap-3 md:grid-cols-3">
          {[
            ["资源", resources],
            ["技能节点", skills],
            ["每日锚点", anchors]
          ].map(([label, value]) => (
            <div key={label} className="rounded border border-white/10 bg-white/[0.035] p-4">
              <div className="text-sm text-muted-foreground">{label}</div>
              <div className="mt-2 font-mono text-3xl text-white">{value}</div>
            </div>
          ))}
        </section>

        <SeedImportButton />

        <section className="rounded border border-white/10 bg-white/[0.035] p-4">
          <h2 className="text-sm font-semibold text-white">环境变量</h2>
          <div className="mt-3 grid gap-2">
            {envRows.map(([key, ok]) => (
              <div key={key} className="flex items-center justify-between gap-4 rounded border border-white/10 bg-black/20 px-3 py-2">
                <span className="font-mono text-xs text-muted-foreground">{key}</span>
                <span className={`font-mono text-xs ${ok ? "text-success" : "text-warning"}`}>
                  {ok ? "已设置" : "缺失"}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded border border-white/10 bg-white/[0.035] p-4">
          <h2 className="text-sm font-semibold text-white">部署地址</h2>
          <p className="mt-2 font-mono text-sm text-primary">lifeos.aialra.online</p>
        </section>
      </div>
    </AppShell>
  );
}
