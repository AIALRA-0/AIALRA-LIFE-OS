"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus } from "lucide-react";

const dayOptions = [
  ["1", "周一"],
  ["2", "周二"],
  ["3", "周三"],
  ["4", "周四"],
  ["5", "周五"],
  ["6", "周六"],
  ["0", "周日"]
];

export function CourseSlotForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      courseName: String(formData.get("courseName") ?? ""),
      courseCode: String(formData.get("courseCode") ?? ""),
      instructor: String(formData.get("instructor") ?? ""),
      dayOfWeek: Number(formData.get("dayOfWeek") ?? 1),
      startTime: String(formData.get("startTime") ?? ""),
      endTime: String(formData.get("endTime") ?? ""),
      location: String(formData.get("location") ?? ""),
      term: String(formData.get("term") ?? ""),
      locked: formData.get("locked") === "on",
      active: true
    };

    setMessage("");
    const response = await fetch("/api/course-slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      setMessage(error?.error ?? "课程槽保存失败。");
      return;
    }

    form.reset();
    setMessage("课程槽已保存。");
    startTransition(() => router.refresh());
  }

  return (
    <form onSubmit={onSubmit} className="rounded border border-white/10 bg-white/[0.035] p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
        <CalendarPlus className="h-4 w-4 text-primary" />
        新增课程槽
      </div>
      <div className="grid gap-2">
        <input name="courseName" required placeholder="课程名称" className="h-9 rounded border border-white/10 bg-black/24 px-3 text-sm text-white" />
        <input name="courseCode" required placeholder="课程代码" className="h-9 rounded border border-white/10 bg-black/24 px-3 text-sm text-white" />
        <input name="instructor" placeholder="老师，可选" className="h-9 rounded border border-white/10 bg-black/24 px-3 text-sm text-white" />
        <select name="dayOfWeek" defaultValue="1" className="h-9 rounded border border-white/10 bg-black/24 px-3 text-sm text-white">
          {dayOptions.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input name="startTime" required type="time" step="1800" defaultValue="12:00" className="h-9 rounded border border-white/10 bg-black/24 px-3 text-sm text-white" />
          <input name="endTime" required type="time" step="1800" defaultValue="13:30" className="h-9 rounded border border-white/10 bg-black/24 px-3 text-sm text-white" />
        </div>
        <input name="location" placeholder="地点，可选" className="h-9 rounded border border-white/10 bg-black/24 px-3 text-sm text-white" />
        <input name="term" placeholder="学期，可选" className="h-9 rounded border border-white/10 bg-black/24 px-3 text-sm text-white" />
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input name="locked" type="checkbox" defaultChecked className="h-4 w-4 accent-primary" />
          锁定课程，不允许 Repair Plan 自动挪走
        </label>
      </div>
      {message ? <p className="mt-3 text-xs text-muted-foreground">{message}</p> : null}
      <button
        type="submit"
        disabled={isPending}
        className="mt-3 h-9 w-full rounded bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
      >
        保存课程槽
      </button>
    </form>
  );
}
