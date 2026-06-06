import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { zhStatus } from "@/lib/i18n";
import { requirePageUser } from "@/lib/page-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ResourceDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePageUser();
  const { id } = await params;
  const resource = await prisma.resource.findUnique({
    where: { id },
    include: {
      skillEvidence: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { skillNode: true }
      }
    }
  });

  if (!resource) {
    return (
      <AppShell title="资源" subtitle="未找到">
        <div className="rounded border border-white/10 bg-white/[0.035] p-6 text-sm text-muted-foreground">
          没有找到这个资源。<Link className="text-primary" href="/resources">返回资源库</Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={resource.name}
      subtitle={`${resource.language} / ${resource.price} / ${resource.accessChannel}`}
      rightPanel={
        <div className="rounded border border-white/10 bg-white/[0.035] p-4">
          <h2 className="text-sm font-semibold text-white">资源字段</h2>
          <dl className="mt-3 grid gap-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">岗位匹配度</dt>
              <dd className="font-mono text-primary">{resource.jobMatch.toFixed(1)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">学习深度</dt>
              <dd className="text-white">{resource.learningDepth}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">实操性</dt>
              <dd className="text-white">{resource.practicality}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">状态</dt>
              <dd className="text-white">{zhStatus(resource.status)}</dd>
            </div>
          </dl>
        </div>
      }
    >
      <div className="space-y-4">
        <section className="rounded border border-white/10 bg-white/[0.035] p-5">
          <a
            href={resource.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm text-primary"
          >
            打开资源 <ExternalLink className="h-4 w-4" />
          </a>
          <h2 className="mt-4 text-sm font-semibold text-white">完成标准</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{resource.completionThreshold}</p>
          <h2 className="mt-5 text-sm font-semibold text-white">替代风险</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{resource.replacementRisk}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {resource.tags.map((tag) => (
              <span key={tag} className="rounded border border-white/10 px-2 py-1 font-mono text-xs text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded border border-white/10 bg-white/[0.035] p-5">
          <h2 className="text-sm font-semibold text-white">证据</h2>
          <div className="mt-3 grid gap-2">
            {resource.skillEvidence.length > 0 ? (
              resource.skillEvidence.map((evidence) => (
                <div key={evidence.id} className="rounded border border-white/10 bg-black/20 p-3">
                  <div className="text-sm font-medium text-white">{evidence.title}</div>
                  <div className="mt-1 font-mono text-[11px] text-primary">{evidence.skillNode.name}</div>
                  <p className="mt-2 text-sm text-muted-foreground">{evidence.description}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">还没有关联证据。</p>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
