"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { TimelineBlock } from "@/components/plan-block-card";
import { zhDomain, zhStatus } from "@/lib/i18n";

const statuses = ["COMPLETED", "PARTIAL", "MISSED", "SKIPPED", "RESCHEDULED"];

export function CheckinDialog({
  block,
  open,
  onOpenChange
}: {
  block: TimelineBlock | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [status, setStatus] = useState("COMPLETED");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!block) return;

    const formData = new FormData(event.currentTarget);
    const payload = {
      status,
      actualStart: formData.get("actualStart") || null,
      actualEnd: formData.get("actualEnd") || null,
      energy: Number(formData.get("energy") ?? 3),
      focus: Number(formData.get("focus") ?? 3),
      urgeTrigger: formData.get("urgeTrigger") || null,
      note: String(formData.get("note") ?? ""),
      artifactUrl: formData.get("artifactUrl") || null
    };

    setMessage("");
    const response = await fetch(`/api/plan/block/${block.id}/checkin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      setMessage(error?.error ?? "打卡保存失败。");
      return;
    }

    onOpenChange(false);
    startTransition(() => router.refresh());
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,42rem)] -translate-x-1/2 -translate-y-1/2 rounded border border-white/10 bg-panel-strong p-5 shadow-glow">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Dialog.Title className="truncate text-lg font-semibold text-white">
                {block?.title ?? "打卡"}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                {block?.startTime} - {block?.endTime} / {block ? zhDomain(block.domain) : ""}
              </Dialog.Description>
            </div>
            <Dialog.Close className="grid h-8 w-8 place-items-center rounded border border-white/10 text-muted-foreground hover:text-white">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <form onSubmit={onSubmit} className="mt-5 grid gap-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {statuses.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setStatus(item)}
                  className={`h-9 rounded border px-2 font-mono text-[11px] transition ${
                    status === item
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-white/10 bg-white/[0.04] text-muted-foreground hover:text-white"
                  }`}
                >
                  {zhStatus(item)}
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm text-muted-foreground">
                实际开始
                <input
                  name="actualStart"
                  type="datetime-local"
                  className="h-10 rounded border border-white/10 bg-black/24 px-3 text-white"
                />
              </label>
              <label className="grid gap-1 text-sm text-muted-foreground">
                实际结束
                <input
                  name="actualEnd"
                  type="datetime-local"
                  className="h-10 rounded border border-white/10 bg-black/24 px-3 text-white"
                />
              </label>
              <label className="grid gap-1 text-sm text-muted-foreground">
                能量
                <input
                  name="energy"
                  type="number"
                  min="1"
                  max="5"
                  defaultValue="3"
                  className="h-10 rounded border border-white/10 bg-black/24 px-3 text-white"
                />
              </label>
              <label className="grid gap-1 text-sm text-muted-foreground">
                专注
                <input
                  name="focus"
                  type="number"
                  min="1"
                  max="5"
                  defaultValue="3"
                  className="h-10 rounded border border-white/10 bg-black/24 px-3 text-white"
                />
              </label>
            </div>

            <label className="grid gap-1 text-sm text-muted-foreground">
              冲动 / 过载触发点
              <input
                name="urgeTrigger"
                className="h-10 rounded border border-white/10 bg-black/24 px-3 text-white"
                placeholder="可不填"
              />
            </label>
            <label className="grid gap-1 text-sm text-muted-foreground">
              产出物链接
              <input
                name="artifactUrl"
                className="h-10 rounded border border-white/10 bg-black/24 px-3 text-white"
                placeholder="https://..."
              />
            </label>
            <label className="grid gap-1 text-sm text-muted-foreground">
              备注
              <textarea
                name="note"
                rows={4}
                className="resize-none rounded border border-white/10 bg-black/24 px-3 py-2 text-white"
              />
            </label>

            {message ? <p className="text-sm text-danger">{message}</p> : null}
            <button
              type="submit"
              disabled={isPending}
              className="h-10 rounded bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
            >
              保存打卡
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
