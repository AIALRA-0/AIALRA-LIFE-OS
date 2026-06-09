"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import type { LifeContext } from "@/lib/life-context";

export function LifeContextForm({ initialContext }: { initialContext: LifeContext }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setMessage("");

    const response = await fetch("/api/settings/life-context", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personalBackground: String(formData.get("personalBackground") ?? ""),
        longTermPlan: String(formData.get("longTermPlan") ?? ""),
        currentStrategy: String(formData.get("currentStrategy") ?? "")
      })
    });

    const result = await response.json().catch(() => null);
    if (!response.ok) {
      setMessage(result?.error ?? "保存失败。");
      return;
    }

    setMessage("已保存到数据库。");
    startTransition(() => router.refresh());
  }

  return (
    <section className="rounded border border-white/10 bg-white/[0.035] p-4">
      <div>
        <h2 className="text-sm font-semibold text-white">长期上下文</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          这里写入的内容只保存在数据库，用来生成每日 ChatGPT 提示包。
        </p>
      </div>
      <form onSubmit={onSubmit} className="mt-4 grid gap-4">
        <label className="grid gap-1 text-sm text-muted-foreground">
          个人背景
          <textarea
            name="personalBackground"
            rows={7}
            defaultValue={initialContext.personalBackground}
            className="resize-y rounded border border-white/10 bg-black/24 px-3 py-2 text-white"
            placeholder="你的经历、身体状态、学习背景、长期限制、偏好和风险。"
          />
        </label>
        <label className="grid gap-1 text-sm text-muted-foreground">
          长期规划
          <textarea
            name="longTermPlan"
            rows={7}
            defaultValue={initialContext.longTermPlan}
            className="resize-y rounded border border-white/10 bg-black/24 px-3 py-2 text-white"
            placeholder="芯片/EDA、AI Agent、艺术、商业、身体系统等长期目标。"
          />
        </label>
        <label className="grid gap-1 text-sm text-muted-foreground">
          当前战略
          <textarea
            name="currentStrategy"
            rows={6}
            defaultValue={initialContext.currentStrategy}
            className="resize-y rounded border border-white/10 bg-black/24 px-3 py-2 text-white"
            placeholder="最近 1-4 周最重要的方向、取舍和禁止事项。"
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex h-10 items-center justify-center gap-2 rounded bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            保存长期上下文
          </button>
          {message ? <p className="text-sm text-primary">{message}</p> : null}
        </div>
      </form>
    </section>
  );
}
