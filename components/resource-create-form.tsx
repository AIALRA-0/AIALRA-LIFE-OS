"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

export function ResourceCreateForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = {
      name: formData.get("name"),
      url: formData.get("url"),
      language: formData.get("language"),
      price: formData.get("price"),
      learningDepth: formData.get("learningDepth"),
      practicality: formData.get("practicality"),
      jobMatch: Number(formData.get("jobMatch") ?? 5),
      completionThreshold: formData.get("completionThreshold"),
      replacementRisk: formData.get("replacementRisk"),
      tags: String(formData.get("tags") ?? "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      phase: String(formData.get("phase") ?? "review")
        .split(",")
        .map((phase) => phase.trim())
        .filter(Boolean),
      accessChannel: formData.get("accessChannel"),
      notes: formData.get("notes")
    };

    setMessage("");
    const response = await fetch("/api/resources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await response.json().catch(() => null);
    if (!response.ok) {
      setMessage(result?.error ?? "资源保存失败。");
      return;
    }

    event.currentTarget.reset();
    setMessage("资源已保存为待复查。");
    startTransition(() => router.refresh());
  }

  return (
    <details className="rounded border border-white/10 bg-white/[0.035] p-4">
      <summary className="cursor-pointer text-sm font-semibold text-white">
        新增资源
      </summary>
      <form onSubmit={onSubmit} className="mt-4 grid gap-3">
        <div className="grid gap-3 md:grid-cols-2">
          <input name="name" required placeholder="资源名称" className="h-10 rounded border border-white/10 bg-black/24 px-3 text-white" />
          <input name="url" required type="url" placeholder="https://..." className="h-10 rounded border border-white/10 bg-black/24 px-3 text-white" />
          <input name="language" defaultValue="中文/英文" className="h-10 rounded border border-white/10 bg-black/24 px-3 text-white" />
          <input name="price" defaultValue="免费/付费" className="h-10 rounded border border-white/10 bg-black/24 px-3 text-white" />
          <input name="learningDepth" defaultValue="未知" className="h-10 rounded border border-white/10 bg-black/24 px-3 text-white" />
          <input name="practicality" defaultValue="未知" className="h-10 rounded border border-white/10 bg-black/24 px-3 text-white" />
          <input name="jobMatch" type="number" min="0" max="10" step="0.1" defaultValue="5" className="h-10 rounded border border-white/10 bg-black/24 px-3 text-white" />
          <input name="replacementRisk" defaultValue="未知" className="h-10 rounded border border-white/10 bg-black/24 px-3 text-white" />
          <input name="tags" placeholder="eda, verification，用英文逗号分隔" className="h-10 rounded border border-white/10 bg-black/24 px-3 text-white" />
          <input name="phase" defaultValue="review" className="h-10 rounded border border-white/10 bg-black/24 px-3 text-white" />
          <input name="accessChannel" defaultValue="手动添加" className="h-10 rounded border border-white/10 bg-black/24 px-3 text-white" />
        </div>
        <textarea name="completionThreshold" required rows={3} placeholder="完成标准：做到什么才算学完" className="resize-none rounded border border-white/10 bg-black/24 px-3 py-2 text-white" />
        <textarea name="notes" rows={3} placeholder="备注" className="resize-none rounded border border-white/10 bg-black/24 px-3 py-2 text-white" />
        {message ? <p className="text-sm text-primary">{message}</p> : null}
        <button type="submit" disabled={isPending} className="inline-flex h-10 items-center justify-center gap-2 rounded bg-primary px-4 text-sm font-medium text-primary-foreground">
          <Plus className="h-4 w-4" />
          保存资源
        </button>
      </form>
    </details>
  );
}
