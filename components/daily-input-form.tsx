"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Loader2 } from "lucide-react";
import { dateOnly } from "@/lib/utils/time";

const numericFields = [
  ["sleepQuality", "睡眠质量", 1, 5, 3],
  ["weightKg", "体重 kg", 1, 300, 100],
  ["painLevel", "疼痛等级", 0, 5, 0],
  ["energy", "能量", 1, 5, 3],
  ["focus", "专注", 1, 5, 3],
  ["anxiety", "焦虑", 0, 5, 0],
  ["urgeRisk", "冲动风险", 0, 5, 0]
] as const;

export function DailyInputForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [requiresResearch, setRequiresResearch] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = {
      date: formData.get("date"),
      mustDo: formData.get("mustDo"),
      temporaryItems: formData.get("temporaryItems"),
      specialNeeds: formData.get("specialNeeds"),
      requiresResearch
    };

    for (const [name] of numericFields) {
      payload[name] = Number(formData.get(name));
    }

    setMessage("");
    const response = await fetch("/api/plan/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await response.json().catch(() => null);
    if (!response.ok) {
      setMessage(result?.validation?.errors?.join(" / ") ?? result?.error ?? "计划生成失败。");
      return;
    }

    startTransition(() => {
      router.push(`/plan/today?date=${payload.date}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-[12rem_minmax(0,1fr)]">
        <label className="grid gap-1 text-sm text-muted-foreground">
          日期
          <input
            name="date"
            type="date"
            defaultValue={dateOnly()}
            required
            className="h-10 rounded border border-white/10 bg-black/24 px-3 text-white"
          />
        </label>
        <label className="grid gap-1 text-sm text-muted-foreground">
          今天必须完成
          <input
            name="mustDo"
            required
            className="h-10 rounded border border-white/10 bg-black/24 px-3 text-white"
            placeholder="例如：cocotb实验、行政事项、训练"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1 text-sm text-muted-foreground">
          临时事项
          <textarea
            name="temporaryItems"
            rows={5}
            className="resize-none rounded border border-white/10 bg-black/24 px-3 py-2 text-white"
          />
        </label>
        <label className="grid gap-1 text-sm text-muted-foreground">
          特殊需求
          <textarea
            name="specialNeeds"
            rows={5}
            className="resize-none rounded border border-white/10 bg-black/24 px-3 py-2 text-white"
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {numericFields.map(([name, label, min, max, value]) => (
          <label key={name} className="grid gap-1 text-sm text-muted-foreground">
            {label}
            <input
              name={name}
              type="number"
              min={min}
              max={max}
              step={name === "weightKg" ? "0.1" : "1"}
              defaultValue={value}
              className="h-10 rounded border border-white/10 bg-black/24 px-3 font-mono text-white"
            />
          </label>
        ))}
      </div>

      <label className="flex items-center gap-3 rounded border border-white/10 bg-white/[0.035] px-3 py-3 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={requiresResearch}
          onChange={(event) => setRequiresResearch(event.target.checked)}
          className="h-4 w-4 accent-cyan-300"
        />
        需要启动 Deep Research 后台研究
      </label>

      {message ? <p className="rounded border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{message}</p> : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-11 items-center justify-center gap-2 rounded bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
        生成今日计划
      </button>
    </form>
  );
}
