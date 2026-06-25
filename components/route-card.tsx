import { Activity, CheckCircle2, GitBranch, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export type RouteCardRoute = {
  id: string;
  name: string;
  description: string;
  domain: string;
  status: string;
  currentWeekWindow?: { weekIndex: number; totalWeeks: number; completed: boolean };
  currentStage?: { name: string; objective: string; serialOrParallel: string } | null;
  currentWeek?: { title: string; theme: string; expectedEvidence: unknown } | null;
  evidenceNodes?: Array<{
    id: string;
    name: string;
    track: string;
    currentLevel: number;
    nextGate: string;
    confidence: number;
  }>;
};

export function RouteCard({ route, compact = false }: { route: RouteCardRoute; compact?: boolean }) {
  const week = route.currentWeekWindow;

  return (
    <section className="rounded border border-white/10 bg-white/[0.035] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded border border-primary/25 bg-primary/10 px-2 py-0.5 font-mono text-[11px] text-primary">
              {route.domain}
            </span>
            <span className="rounded border border-white/10 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
              {route.status}
            </span>
          </div>
          <h2 className="text-base font-semibold text-white">{route.name}</h2>
          <p className={cn("mt-2 text-sm text-muted-foreground", compact && "line-clamp-2")}>
            {route.description}
          </p>
        </div>
        {week ? (
          <div className="rounded border border-white/10 bg-black/20 px-3 py-2 text-right">
            <div className="font-mono text-xs text-muted-foreground">Week</div>
            <div className="font-mono text-lg font-semibold text-white">
              {week.weekIndex}/{week.totalWeeks}
            </div>
          </div>
        ) : null}
      </div>

      {route.currentStage ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <div className="rounded border border-white/10 bg-black/20 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-primary">
              <GitBranch className="h-3.5 w-3.5" />
              当前阶段
            </div>
            <div className="text-sm font-semibold text-white">{route.currentStage.name}</div>
            <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
              {route.currentStage.objective}
            </p>
          </div>
          <div className="rounded border border-white/10 bg-black/20 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-accent-foreground">
              <Activity className="h-3.5 w-3.5" />
              当前周主题
            </div>
            <div className="text-sm font-semibold text-white">
              {route.currentWeek?.title ?? "未生成周主题"}
            </div>
            <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
              {route.currentWeek?.theme ?? "等待 seed 导入。"}
            </p>
          </div>
        </div>
      ) : null}

      {route.evidenceNodes?.length ? (
        <div className="mt-4 grid gap-2">
          {route.evidenceNodes.slice(0, compact ? 3 : 6).map((node) => (
            <div
              key={node.id}
              className="grid gap-2 rounded border border-white/10 bg-black/16 p-3 md:grid-cols-[minmax(0,1fr)_6rem]"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium text-white">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  {node.name}
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">{node.nextGate}</p>
              </div>
              <div className="flex items-center justify-start gap-2 md:justify-end">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                <span className="font-mono text-xs text-muted-foreground">
                  L{node.currentLevel} / {node.confidence}%
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
