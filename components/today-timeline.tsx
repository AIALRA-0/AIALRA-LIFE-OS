"use client";

import { useMemo, useState } from "react";
import { CheckinDialog } from "@/components/checkin-dialog";
import { PlanBlockCard, type TimelineBlock } from "@/components/plan-block-card";
import { getCurrentPlanSlot } from "@/lib/utils/time";

export function TodayTimeline({
  blocks,
  interactive = true
}: {
  blocks: TimelineBlock[];
  interactive?: boolean;
}) {
  const [selected, setSelected] = useState<TimelineBlock | null>(null);
  const currentSlot = useMemo(() => getCurrentPlanSlot(), []);

  return (
    <div className="space-y-2">
      {blocks.map((block) => (
        <PlanBlockCard
          key={block.id}
          block={block}
          active={
            currentSlot.state === "active" &&
            currentSlot.slot?.start === block.startTime &&
            currentSlot.slot?.end === block.endTime
          }
          onClick={interactive ? () => setSelected(block) : undefined}
        />
      ))}
      <CheckinDialog
        block={selected}
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </div>
  );
}
