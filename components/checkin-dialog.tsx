"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { TimelineBlock } from "@/components/plan-block-card";
import { zhDomain, zhStatus } from "@/lib/i18n";

const statuses = ["COMPLETED", "PARTIAL", "MISSED", "SKIPPED", "RESCHEDULED"];

function getBodyMode(block: TimelineBlock | null) {
  const marker = `${block?.domain ?? ""} ${block?.title ?? ""} ${block?.route?.name ?? ""}`.toLowerCase();
  if (marker.includes("movement") || marker.includes("运动训练")) return "movement";
  if (marker.includes("activation") || marker.includes("身体激活")) return "activation";
  if (marker.includes("diet") || marker.includes("餐")) return "diet";
  return null;
}

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
    const mode = getBodyMode(block);
    const bodyBool = (name: string) => (mode ? formData.get(name) === "on" : null);
    const payload = {
      status,
      actualStart: formData.get("actualStart") || null,
      actualEnd: formData.get("actualEnd") || null,
      actualMinutes: formData.get("actualMinutes") || null,
      energy: Number(formData.get("energy") ?? 3),
      focus: Number(formData.get("focus") ?? 3),
      painOrFatigue: formData.get("painOrFatigue") || null,
      distractionLevel: formData.get("distractionLevel") || null,
      urgeTrigger: formData.get("urgeTrigger") || null,
      note: String(formData.get("note") ?? ""),
      artifactUrl: formData.get("artifactUrl") || null,
      painBefore: formData.get("painBefore") || null,
      painAfter: formData.get("painAfter") || null,
      stiffnessBefore: formData.get("stiffnessBefore") || null,
      stiffnessAfter: formData.get("stiffnessAfter") || null,
      hipTightness: formData.get("hipTightness") || null,
      neckShoulderTension: formData.get("neckShoulderTension") || null,
      lumbarSignal: formData.get("lumbarSignal") || null,
      activationCompleted: bodyBool("activationCompleted"),
      trainingType: formData.get("trainingType") || null,
      durationMinutes: formData.get("durationMinutes") || null,
      distanceOrSteps: formData.get("distanceOrSteps") || null,
      setsCompleted: formData.get("setsCompleted") || null,
      rpe: formData.get("rpe") || null,
      fatigueAfter: formData.get("fatigueAfter") || null,
      zone2Completed: bodyBool("zone2Completed"),
      strengthCompleted: bodyBool("strengthCompleted"),
      mobilityCompleted: bodyBool("mobilityCompleted"),
      evidenceText: formData.get("evidenceText") || null,
      evidenceUrl: formData.get("evidenceUrl") || null
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

  const bodyMode = getBodyMode(block);

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
              <label className="grid gap-1 text-sm text-muted-foreground">
                实际分钟
                <input
                  name="actualMinutes"
                  type="number"
                  min="0"
                  max="1020"
                  placeholder="可不填"
                  className="h-10 rounded border border-white/10 bg-black/24 px-3 text-white"
                />
              </label>
              <label className="grid gap-1 text-sm text-muted-foreground">
                疼痛/疲劳
                <input
                  name="painOrFatigue"
                  type="number"
                  min="0"
                  max="5"
                  placeholder="0-5"
                  className="h-10 rounded border border-white/10 bg-black/24 px-3 text-white"
                />
              </label>
              <label className="grid gap-1 text-sm text-muted-foreground">
                分心水平
                <input
                  name="distractionLevel"
                  type="number"
                  min="0"
                  max="5"
                  placeholder="0-5"
                  className="h-10 rounded border border-white/10 bg-black/24 px-3 text-white"
                />
              </label>
            </div>

            {bodyMode ? (
              <section className="rounded border border-white/10 bg-black/18 p-3">
                <h3 className="text-sm font-semibold text-white">
                  {bodyMode === "movement" ? "运动训练记录" : bodyMode === "activation" ? "身体激活记录" : "饮食记录"}
                </h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <label className="grid gap-1 text-sm text-muted-foreground">
                    pain before
                    <input name="painBefore" type="number" min="0" max="5" className="h-10 rounded border border-white/10 bg-black/24 px-3 text-white" />
                  </label>
                  <label className="grid gap-1 text-sm text-muted-foreground">
                    pain after
                    <input name="painAfter" type="number" min="0" max="5" className="h-10 rounded border border-white/10 bg-black/24 px-3 text-white" />
                  </label>
                  <label className="grid gap-1 text-sm text-muted-foreground">
                    僵硬 after
                    <input name="stiffnessAfter" type="number" min="0" max="5" className="h-10 rounded border border-white/10 bg-black/24 px-3 text-white" />
                  </label>
                </div>

                {bodyMode === "activation" ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-4">
                    <label className="grid gap-1 text-sm text-muted-foreground">
                      僵硬 before
                      <input name="stiffnessBefore" type="number" min="0" max="5" className="h-10 rounded border border-white/10 bg-black/24 px-3 text-white" />
                    </label>
                    <label className="grid gap-1 text-sm text-muted-foreground">
                      髋紧张
                      <input name="hipTightness" type="number" min="0" max="5" className="h-10 rounded border border-white/10 bg-black/24 px-3 text-white" />
                    </label>
                    <label className="grid gap-1 text-sm text-muted-foreground">
                      肩颈紧张
                      <input name="neckShoulderTension" type="number" min="0" max="5" className="h-10 rounded border border-white/10 bg-black/24 px-3 text-white" />
                    </label>
                    <label className="grid gap-1 text-sm text-muted-foreground">
                      腰椎信号
                      <input name="lumbarSignal" type="number" min="0" max="5" className="h-10 rounded border border-white/10 bg-black/24 px-3 text-white" />
                    </label>
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      <input name="activationCompleted" type="checkbox" defaultChecked className="h-4 w-4 accent-primary" />
                      激活完成
                    </label>
                  </div>
                ) : null}

                {bodyMode === "movement" ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <label className="grid gap-1 text-sm text-muted-foreground">
                      训练类型
                      <input name="trainingType" placeholder="run-walk / strength / recovery" className="h-10 rounded border border-white/10 bg-black/24 px-3 text-white" />
                    </label>
                    <label className="grid gap-1 text-sm text-muted-foreground">
                      训练分钟
                      <input name="durationMinutes" type="number" min="0" max="300" className="h-10 rounded border border-white/10 bg-black/24 px-3 text-white" />
                    </label>
                    <label className="grid gap-1 text-sm text-muted-foreground">
                      RPE
                      <input name="rpe" type="number" min="0" max="10" className="h-10 rounded border border-white/10 bg-black/24 px-3 text-white" />
                    </label>
                    <label className="grid gap-1 text-sm text-muted-foreground">
                      距离/步数
                      <input name="distanceOrSteps" className="h-10 rounded border border-white/10 bg-black/24 px-3 text-white" />
                    </label>
                    <label className="grid gap-1 text-sm text-muted-foreground">
                      完成组数
                      <input name="setsCompleted" className="h-10 rounded border border-white/10 bg-black/24 px-3 text-white" />
                    </label>
                    <label className="grid gap-1 text-sm text-muted-foreground">
                      fatigue after
                      <input name="fatigueAfter" type="number" min="0" max="5" className="h-10 rounded border border-white/10 bg-black/24 px-3 text-white" />
                    </label>
                    <div className="flex flex-wrap gap-4 sm:col-span-3">
                      <label className="flex items-center gap-2 text-sm text-muted-foreground">
                        <input name="zone2Completed" type="checkbox" className="h-4 w-4 accent-primary" />
                        Zone2
                      </label>
                      <label className="flex items-center gap-2 text-sm text-muted-foreground">
                        <input name="strengthCompleted" type="checkbox" className="h-4 w-4 accent-primary" />
                        力量
                      </label>
                      <label className="flex items-center gap-2 text-sm text-muted-foreground">
                        <input name="mobilityCompleted" type="checkbox" className="h-4 w-4 accent-primary" />
                        Mobility
                      </label>
                    </div>
                  </div>
                ) : null}

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm text-muted-foreground">
                    证据文字
                    <input name="evidenceText" className="h-10 rounded border border-white/10 bg-black/24 px-3 text-white" />
                  </label>
                  <label className="grid gap-1 text-sm text-muted-foreground">
                    证据链接
                    <input name="evidenceUrl" className="h-10 rounded border border-white/10 bg-black/24 px-3 text-white" />
                  </label>
                </div>
              </section>
            ) : null}

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
