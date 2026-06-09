"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clipboard, Download, FileText, Import, Loader2, MessageSquareText, PackageOpen } from "lucide-react";
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

type PromptPackageResult = {
  agentRunId: string;
  dailyInputId: string;
  date: string;
  prompt: string;
  chatMessage: string;
  uploadFiles: Array<{
    filename: string;
    mimeType: string;
    description: string;
    content: string;
  }>;
  importInstructions: string;
};

export function DailyInputForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [promptPackage, setPromptPackage] = useState<PromptPackageResult | null>(null);
  const [planJson, setPlanJson] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImporting, startImportTransition] = useTransition();

  async function onGeneratePackage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = {
      date: formData.get("date"),
      mustDo: formData.get("mustDo"),
      temporaryItems: formData.get("temporaryItems"),
      specialNeeds: formData.get("specialNeeds"),
      externalMessageSummary: formData.get("externalMessageSummary")
    };

    for (const [name] of numericFields) {
      payload[name] = Number(formData.get(name));
    }

    setMessage("");
    setCopyMessage("");
    setIsGenerating(true);
    const response = await fetch("/api/plan/prompt-package", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    setIsGenerating(false);

    const result = await response.json().catch(() => null);
    if (!response.ok) {
      setMessage(result?.error ?? "提示包生成失败。");
      return;
    }

    setPromptPackage(result);
    setPlanJson("");
    setMessage("提示包已生成。复制到 ChatGPT Pro 后，把返回 JSON 粘贴到下方导入。");
  }

  async function copyText(value: string, doneMessage: string) {
    await navigator.clipboard.writeText(value);
    setCopyMessage(doneMessage);
  }

  function downloadUploadFile(file: PromptPackageResult["uploadFiles"][number]) {
    const blob = new Blob([file.content], { type: file.mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = file.filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function importPlan() {
    if (!promptPackage) return;
    setMessage("");

    const response = await fetch("/api/plan/import-json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentRunId: promptPackage.agentRunId,
        dailyInputId: promptPackage.dailyInputId,
        date: promptPackage.date,
        planJson
      })
    });

    const result = await response.json().catch(() => null);
    if (!response.ok) {
      const errors = result?.validation?.errors?.join("\n");
      setMessage(errors ? `${result?.error ?? "导入失败。"}\n${errors}` : result?.error ?? "导入失败。");
      return;
    }

    startImportTransition(() => {
      router.push(`/plan/today?date=${promptPackage.date}`);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-5">
      <form onSubmit={onGeneratePackage} className="grid gap-5">
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
              placeholder="例如：芯片/EDA最小产出、一个行政节点、身体训练"
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
              placeholder="今天突然出现、需要插入计划的事情。"
            />
          </label>
          <label className="grid gap-1 text-sm text-muted-foreground">
            特殊需求
            <textarea
              name="specialNeeds"
              rows={5}
              className="resize-none rounded border border-white/10 bg-black/24 px-3 py-2 text-white"
              placeholder="比如低强度、某时间段不可用、必须先处理某个节点。"
            />
          </label>
        </div>

        <label className="grid gap-1 text-sm text-muted-foreground">
          今日外部消息摘要
          <textarea
            name="externalMessageSummary"
            rows={6}
            className="resize-y rounded border border-white/10 bg-black/24 px-3 py-2 text-white"
            placeholder="手动粘贴 Gmail、微信、短信、消息记录摘要。第一阶段不自动读取消息。"
          />
        </label>

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

        <button
          type="submit"
          disabled={isGenerating}
          className="inline-flex h-11 items-center justify-center gap-2 rounded bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
        >
          {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageOpen className="h-4 w-4" />}
          生成 ChatGPT 提示包
        </button>
      </form>

      {message ? (
        <p className="whitespace-pre-wrap rounded border border-primary/25 bg-primary/10 p-3 text-sm text-primary">
          {message}
        </p>
      ) : null}

      {promptPackage ? (
        <section className="grid gap-4 rounded border border-white/10 bg-white/[0.035] p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">第二步：上传文件到 ChatGPT Pro</h2>
              <p className="mt-1 text-sm text-muted-foreground">{promptPackage.importInstructions}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => copyText(promptPackage.chatMessage, "已复制开场消息。")}
                className="inline-flex h-10 items-center justify-center gap-2 rounded border border-primary/30 px-4 text-sm text-primary hover:bg-primary/10"
              >
                <MessageSquareText className="h-4 w-4" />
                复制开场消息
              </button>
              <button
                type="button"
                onClick={() => copyText(promptPackage.prompt, "已复制完整提示包。")}
                className="inline-flex h-10 items-center justify-center gap-2 rounded border border-white/10 px-4 text-sm text-white hover:bg-white/[0.06]"
              >
                <Clipboard className="h-4 w-4" />
                复制完整提示包
              </button>
            </div>
          </div>
          {copyMessage ? <p className="text-sm text-primary">{copyMessage}</p> : null}

          <div className="grid gap-3">
            {promptPackage.uploadFiles.map((file) => (
              <article
                key={file.filename}
                className="grid gap-3 rounded border border-white/10 bg-black/20 p-3 md:grid-cols-[minmax(0,1fr)_auto]"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="truncate font-mono">{file.filename}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{file.description}</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row md:justify-end">
                  <button
                    type="button"
                    onClick={() => copyText(file.content, `已复制 ${file.filename}。`)}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded border border-white/10 px-3 text-xs text-white hover:bg-white/[0.06]"
                  >
                    <Clipboard className="h-3.5 w-3.5" />
                    复制内容
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadUploadFile(file)}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded border border-white/10 px-3 text-xs text-white hover:bg-white/[0.06]"
                  >
                    <Download className="h-3.5 w-3.5" />
                    下载文件
                  </button>
                </div>
              </article>
            ))}
          </div>

          <textarea
            readOnly
            value={promptPackage.prompt}
            rows={18}
            className="resize-y rounded border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs leading-5 text-slate-200"
          />

          <div className="grid gap-2">
            <h2 className="text-sm font-semibold text-white">第三步：粘贴 ChatGPT 返回的 JSON</h2>
            <textarea
              value={planJson}
              onChange={(event) => setPlanJson(event.target.value)}
              rows={16}
              className="resize-y rounded border border-white/10 bg-black/24 px-3 py-2 font-mono text-xs leading-5 text-white"
              placeholder="这里粘贴 ChatGPT 返回的完整 JSON。可以包含 ```json 代码块，系统会自动提取。"
            />
            <button
              type="button"
              onClick={importPlan}
              disabled={isImporting || !planJson.trim()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
            >
              {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Import className="h-4 w-4" />}
              校验并导入今日计划
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
