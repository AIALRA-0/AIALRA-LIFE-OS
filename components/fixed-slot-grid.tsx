import { Lock, MoveRight } from "lucide-react";
import type { ResolvedFixedSlot } from "@/lib/routes/fixed-slots";

export function FixedSlotGrid({ slots }: { slots: ResolvedFixedSlot[] }) {
  return (
    <div className="grid gap-2">
      {slots.map((slot) => (
        <div
          key={`${slot.source}-${slot.id}`}
          className="grid gap-2 rounded border border-white/10 bg-white/[0.035] p-3 md:grid-cols-[7rem_minmax(0,1fr)_7rem]"
        >
          <div className="font-mono text-xs text-muted-foreground">
            <div className="text-white">{slot.startTime}</div>
            <div>{slot.endTime}</div>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-sm font-semibold text-white">{slot.title}</span>
              {slot.protected ? <Lock className="h-3.5 w-3.5 text-warning" /> : null}
            </div>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {slot.defaultRule ?? slot.reason ?? "固定时间片"}
            </p>
          </div>
          <div className="flex items-center justify-start gap-2 md:justify-end">
            <MoveRight className="h-3.5 w-3.5 text-primary" />
            <span className="font-mono text-[11px] text-muted-foreground">{slot.slotType}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
