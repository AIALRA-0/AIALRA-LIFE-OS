import { Bot, CheckCircle2, Clock, XCircle } from "lucide-react";
import { zhRunType, zhStatus } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type AgentRunData = {
  id: string;
  runType: string;
  model: string;
  status: string;
  createdAt: string;
  completedAt?: string | null;
  error?: string | null;
  outputText?: string | null;
};

export function AgentRunPanel({ runs }: { runs: AgentRunData[] }) {
  return (
    <div className="space-y-3">
      {runs.map((run) => {
        const Icon =
          run.status === "COMPLETED" ? CheckCircle2 : run.status === "FAILED" ? XCircle : Clock;
        return (
          <article key={run.id} className="rounded border border-white/10 bg-white/[0.035] p-3">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-white">{zhRunType(run.runType)}</div>
                <div className="truncate font-mono text-[11px] text-muted-foreground">{run.model}</div>
              </div>
              <Icon
                className={cn(
                  "h-4 w-4",
                  run.status === "COMPLETED"
                    ? "text-success"
                    : run.status === "FAILED"
                      ? "text-danger"
                      : "text-warning"
                )}
              />
            </div>
            <div className="mt-2 font-mono text-[11px] text-muted-foreground">
              {zhStatus(run.status)} / {new Date(run.createdAt).toLocaleString("zh-CN")}
            </div>
            {run.error ? <p className="mt-2 line-clamp-3 text-xs text-danger">{run.error}</p> : null}
            {run.outputText ? (
              <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">{run.outputText}</p>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
