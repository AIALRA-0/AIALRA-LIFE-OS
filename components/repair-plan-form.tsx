"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Wrench } from "lucide-react";

export function RepairPlanForm({ date }: { date: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      date,
      startTime: String(formData.get("startTime") ?? ""),
      endTime: String(formData.get("endTime") ?? ""),
      insertedTitle: String(formData.get("insertedTitle") ?? ""),
      reason: String(formData.get("reason") ?? ""),
      source: "USER_CONFLICT"
    };

    setMessage("");
    const response = await fetch("/api/plan/repair", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setMessage(data?.error ?? "修复失败。");
      return;
    }

    form.reset();
    setMessage(`已修复 ${data.repairedBlockIds?.length ?? 0} 个 block。`);
    startTransition(() => router.refresh());
  }

  return (
    <form onSubmit={onSubmit} className="rounded border border-white/10 bg-white/[0.035] p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
        <Wrench className="h-4 w-4 text-warning" />
        今日变动 / Repair Plan
      </div>
      <div className="grid gap-2">
        <div className="grid grid-cols-2 gap-2">
          <input name="startTime" required type="time" step="1800" defaultValue="15:00" className="h-9 rounded border border-white/10 bg-black/24 px-3 text-sm text-white" />
          <input name="endTime" required type="time" step="1800" defaultValue="15:30" className="h-9 rounded border border-white/10 bg-black/24 px-3 text-sm text-white" />
        </div>
        <input name="insertedTitle" required placeholder="变动标题，例如：回邮件 / 预约 / 临时会议" className="h-9 rounded border border-white/10 bg-black/24 px-3 text-sm text-white" />
        <textarea name="reason" required rows={3} placeholder="为什么插入，影响哪些事情" className="resize-none rounded border border-white/10 bg-black/24 px-3 py-2 text-sm text-white" />
      </div>
      {message ? <p className="mt-3 text-xs text-muted-foreground">{message}</p> : null}
      <button
        type="submit"
        disabled={isPending}
        className="mt-3 h-9 w-full rounded bg-warning px-3 text-sm font-medium text-black disabled:opacity-60"
      >
        修复今日计划
      </button>
    </form>
  );
}
