import Link from "next/link";
import { Filter } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ResourceCard } from "@/components/resource-card";
import { ResourceCreateForm } from "@/components/resource-create-form";
import { zhResourceGroup, zhStatus } from "@/lib/i18n";
import { requirePageUser } from "@/lib/page-auth";
import { prisma } from "@/lib/prisma";
import { filterResources, groupResourcesByDomain } from "@/lib/resources/filter";

export const dynamic = "force-dynamic";

export default async function ResourcesPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; tag?: string; phase?: string; status?: string }>;
}) {
  await requirePageUser();
  const params = await searchParams;
  const resources = await prisma.resource.findMany({
    orderBy: [{ jobMatch: "desc" }, { name: "asc" }]
  });
  const filtered = filterResources(resources, {
    query: params.q,
    tag: params.tag,
    phase: params.phase,
    status: params.status
  });
  const groups = groupResourcesByDomain(resources);

  return (
    <AppShell
      title="资源库"
      subtitle="搜索、筛选、新增学习资源，并记录完成标准。"
      rightPanel={
        <div className="space-y-4">
          <div className="rounded border border-white/10 bg-white/[0.035] p-4">
            <h2 className="text-sm font-semibold text-white">资源分布</h2>
            <dl className="mt-3 grid gap-2 text-sm">
              {Object.entries(groups).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{zhResourceGroup(key)}</dt>
                  <dd className="font-mono text-primary">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <ResourceCreateForm />
        </div>
      }
    >
      <div className="space-y-4">
        <form className="rounded border border-white/10 bg-white/[0.035] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
            <Filter className="h-4 w-4 text-primary" />
            筛选
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <input name="q" defaultValue={params.q} placeholder="搜索名称/标签/阶段" className="h-10 rounded border border-white/10 bg-black/24 px-3 text-white" />
            <input name="tag" defaultValue={params.tag} placeholder="标签" className="h-10 rounded border border-white/10 bg-black/24 px-3 text-white" />
            <input name="phase" defaultValue={params.phase} placeholder="阶段" className="h-10 rounded border border-white/10 bg-black/24 px-3 text-white" />
            <select name="status" defaultValue={params.status} className="h-10 rounded border border-white/10 bg-black/24 px-3 text-white">
              <option value="">任意状态</option>
              <option value="SEED">{zhStatus("SEED")}</option>
              <option value="ACTIVE">{zhStatus("ACTIVE")}</option>
              <option value="REVIEW">{zhStatus("REVIEW")}</option>
              <option value="ARCHIVED">{zhStatus("ARCHIVED")}</option>
            </select>
          </div>
          <div className="mt-3 flex gap-2">
            <button className="h-9 rounded bg-primary px-4 text-sm font-medium text-primary-foreground">
              应用
            </button>
            <Link href="/resources" className="inline-flex h-9 items-center rounded border border-white/10 px-4 text-sm text-muted-foreground">
              重置
            </Link>
          </div>
        </form>

        <div className="grid gap-3">
          {filtered.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
