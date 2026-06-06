"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Database, Loader2 } from "lucide-react";

export function SeedImportButton() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  async function importSeed() {
    setMessage("");
    const response = await fetch("/api/seed/import", { method: "POST" });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      setMessage(result?.error ?? "种子数据导入失败。");
      return;
    }
    setMessage(`已导入 ${result.resources} 条资源、${result.skillNodes} 个技能节点、${result.anchors} 个锚点。`);
    startTransition(() => router.refresh());
  }

  return (
    <div className="rounded border border-white/10 bg-white/[0.035] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">导入初始数据</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            写入长期框架、每日锚点、资源库、技能树、模板和 AI 输出结构。
          </p>
        </div>
        <button
          type="button"
          onClick={importSeed}
          disabled={isPending}
          className="inline-flex h-10 items-center justify-center gap-2 rounded bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
          导入数据
        </button>
      </div>
      {message ? <p className="mt-3 text-sm text-primary">{message}</p> : null}
    </div>
  );
}
