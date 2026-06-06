"use client";

import { useState, useTransition } from "react";
import { FileText, Loader2 } from "lucide-react";
import { dateOnly } from "@/lib/utils/time";

type ReviewResult = {
  summary: string;
  completionRate: number;
  riskFlags: string[];
  tomorrowFocus: string[];
};

export function ReviewSummaryCard({ defaultDate = dateOnly() }: { defaultDate?: string }) {
  const [date, setDate] = useState(defaultDate);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  async function generateReview() {
    setMessage("");
    const response = await fetch("/api/review/daily", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, mode: "generate_and_save" })
    });

    const json = await response.json().catch(() => null);
    if (!response.ok) {
      setMessage(json?.error ?? "日结生成失败。");
      return;
    }

    startTransition(() => setResult(json));
  }

  return (
    <section className="rounded border border-white/10 bg-white/[0.035] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label className="grid gap-1 text-sm text-muted-foreground">
          复盘日期
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="h-10 rounded border border-white/10 bg-black/24 px-3 text-white"
          />
        </label>
        <button
          type="button"
          onClick={generateReview}
          disabled={isPending}
          className="inline-flex h-10 items-center justify-center gap-2 rounded bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          生成日结
        </button>
      </div>

      {message ? <p className="mt-4 text-sm text-danger">{message}</p> : null}

      {result ? (
        <div className="mt-5 space-y-4">
          <div>
            <div className="font-mono text-xs text-primary">
              完成率 {(result.completionRate * 100).toFixed(0)}%
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-200">{result.summary}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-white">风险标记</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {(result.riskFlags.length ? result.riskFlags : ["无"]).map((flag) => (
                  <span key={flag} className="rounded border border-white/10 px-2 py-1 font-mono text-xs text-muted-foreground">
                    {flag}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">明日重点</h3>
              <ul className="mt-2 grid gap-1 text-sm text-muted-foreground">
                {result.tomorrowFocus.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
