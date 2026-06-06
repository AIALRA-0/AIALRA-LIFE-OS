import { Box, CheckCircle2, CircleDot, LinkIcon } from "lucide-react";
import { RiskFlagBadge } from "@/components/risk-flag-badge";
import { zhDomain, zhStatus } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type TimelineBlock = {
  id: string;
  startTime: string;
  endTime: string;
  domain: string;
  title: string;
  method: string;
  expectedOutput: string;
  difficulty: number;
  status: string;
  resources: Array<{ id: string; name: string }>;
  skills: Array<{ id: string; name: string }>;
};

const statusClass: Record<string, string> = {
  COMPLETED: "border-success/35 bg-success/10",
  PARTIAL: "border-warning/35 bg-warning/10",
  MISSED: "border-danger/35 bg-danger/10",
  SKIPPED: "border-white/10 bg-white/[0.03]",
  RESCHEDULED: "border-accent/35 bg-accent/10",
  IN_PROGRESS: "border-primary/45 bg-primary/10"
};

export function PlanBlockCard({
  block,
  active = false,
  onClick
}: {
  block: TimelineBlock;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative grid w-full grid-cols-[5.5rem_minmax(0,1fr)] gap-3 rounded border p-3 text-left transition",
        "hover:border-primary/40 hover:bg-primary/[0.045]",
        statusClass[block.status] ?? "border-white/10 bg-white/[0.035]",
        active && "border-primary/60 shadow-glow"
      )}
    >
      <div className="font-mono text-xs text-muted-foreground">
        <div className="text-white">{block.startTime}</div>
        <div>{block.endTime}</div>
      </div>
      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="rounded border border-white/10 bg-black/20 px-2 py-0.5 text-[11px] text-primary">
            {zhDomain(block.domain)}
          </span>
          <RiskFlagBadge level={block.status === "MISSED" ? "overloaded" : "normal"} label={zhStatus(block.status)} />
          <span className="font-mono text-[11px] text-muted-foreground">
            难度 {block.difficulty}
          </span>
        </div>
        <h3 className="truncate text-sm font-semibold text-white">{block.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{block.method}</p>
        <div className="mt-2 flex items-start gap-2 text-xs text-slate-300">
          <Box className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="line-clamp-2">{block.expectedOutput}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {block.resources.slice(0, 3).map((resource) => (
            <span
              key={resource.id}
              className="inline-flex max-w-full items-center gap-1 rounded border border-white/10 px-2 py-0.5 text-[11px] text-muted-foreground"
            >
              <LinkIcon className="h-3 w-3 shrink-0" />
              <span className="truncate">{resource.name}</span>
            </span>
          ))}
          {block.skills.slice(0, 3).map((skill) => (
            <span
              key={skill.id}
              className="inline-flex max-w-full items-center gap-1 rounded border border-accent/25 bg-accent/10 px-2 py-0.5 text-[11px] text-accent-foreground"
            >
              <CircleDot className="h-3 w-3 shrink-0" />
              <span className="truncate">{skill.name}</span>
            </span>
          ))}
        </div>
        {block.status === "COMPLETED" ? (
          <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-success" />
        ) : null}
      </div>
    </button>
  );
}
