"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckinDialog } from "@/components/checkin-dialog";
import { PlanBlockCard, type TimelineBlock } from "@/components/plan-block-card";
import { getCurrentPlanSlot, timeToMinutes } from "@/lib/utils/time";

export function TodayTimeline({
  blocks,
  interactive = true
}: {
  blocks: TimelineBlock[];
  interactive?: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<TimelineBlock | null>(null);
  const [, startTransition] = useTransition();
  const currentSlot = useMemo(() => getCurrentPlanSlot(), []);

  async function quickComplete(block: TimelineBlock) {
    const actualMinutes = timeToMinutes(block.endTime) - timeToMinutes(block.startTime);
    const payload = {
      status: "COMPLETED",
      actualMinutes,
      energy: 3,
      focus: 3,
      note: "一键完成"
    };

    const response = await fetch(`/api/plan/block/${block.id}/checkin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      startTransition(() => router.refresh());
    }
  }

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
          onQuickComplete={
            interactive && block.status !== "COMPLETED" ? () => quickComplete(block) : undefined
          }
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
