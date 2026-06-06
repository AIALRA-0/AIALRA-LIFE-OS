import { CheckCircle2, Circle, Clock3 } from "lucide-react";
import { cn } from "@/lib/utils";

export type AnchorStatus = {
  code: string;
  name: string;
  time: string;
  done: boolean;
};

export function AnchorStrip({ anchors }: { anchors: AnchorStatus[] }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">每日锚点</h2>
        <span className="font-mono text-xs text-muted-foreground">
          {anchors.filter((anchor) => anchor.done).length}/{anchors.length}
        </span>
      </div>
      <div className="grid gap-2">
        {anchors.map((anchor) => {
          const Icon = anchor.done ? CheckCircle2 : anchor.time === "20:00" ? Clock3 : Circle;
          return (
            <div
              key={anchor.code}
              className={cn(
                "flex items-center gap-3 rounded border px-3 py-2",
                anchor.done
                  ? "border-success/25 bg-success/10 text-success"
                  : "border-white/10 bg-white/[0.035] text-muted-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">{anchor.name}</div>
                <div className="font-mono text-[11px] opacity-75">{anchor.time}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
