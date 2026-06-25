"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bot } from "lucide-react";

export type SidecarTaskSummary = {
  id: string;
  title: string;
  status: string;
  outputSummary?: string | null;
  artifactUrl?: string | null;
};

export function CodexSidecarTaskPanel({ tasks }: { tasks: SidecarTaskSummary[] }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      title: String(formData.get("title") ?? ""),
      prompt: String(formData.get("prompt") ?? ""),
      repoUrl: String(formData.get("repoUrl") ?? "")
    };

    setMessage("");
    const response = await fetch("/api/sidecar-tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      setMessage(error?.error ?? "Sidecar 任务创建失败。");
      return;
    }

    form.reset();
    setMessage("Sidecar 任务已加入队列。");
    startTransition(() => router.refresh());
  }

  return (
    <section className="rounded border border-white/10 bg-white/[0.035] p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
        <Bot className="h-4 w-4 text-primary" />
        Codex Sidecar
      </div>
      <div className="mb-4 grid gap-2">
        {tasks.length === 0 ? (
          <p className="text-xs text-muted-foreground">暂无 Sidecar 任务。</p>
        ) : (
          tasks.slice(0, 5).map((task) => (
            <div key={task.id} className="rounded border border-white/10 bg-black/20 p-2">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-medium text-white">{task.title}</span>
                <span className="font-mono text-[10px] text-primary">{task.status}</span>
              </div>
              {task.outputSummary ? (
                <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{task.outputSummary}</p>
              ) : null}
            </div>
          ))
        )}
      </div>
      <form onSubmit={onSubmit} className="grid gap-2">
        <input name="title" required placeholder="任务标题" className="h-9 rounded border border-white/10 bg-black/24 px-3 text-sm text-white" />
        <input name="repoUrl" placeholder="Repo URL，可选" className="h-9 rounded border border-white/10 bg-black/24 px-3 text-sm text-white" />
        <textarea name="prompt" required rows={3} placeholder="交给 Codex 的执行提示" className="resize-none rounded border border-white/10 bg-black/24 px-3 py-2 text-sm text-white" />
        {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
        <button
          type="submit"
          disabled={isPending}
          className="h-9 rounded bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          加入 Sidecar 队列
        </button>
      </form>
    </section>
  );
}
