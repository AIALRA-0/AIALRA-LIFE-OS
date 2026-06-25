import { timeToMinutes } from "@/lib/utils/time";

export type SlotLike = {
  id: string;
  startTime: string;
  endTime: string;
  title: string;
  protected?: boolean;
  flexible?: boolean;
};

export type ResolvedFixedSlot = SlotLike & {
  source: "template" | "course" | "open_agent";
  slotType: string;
  routeDomain?: string | null;
  defaultRule?: string;
  reason?: string | null;
};

export function slotsOverlap(a: Pick<SlotLike, "startTime" | "endTime">, b: Pick<SlotLike, "startTime" | "endTime">) {
  return timeToMinutes(a.startTime) < timeToMinutes(b.endTime) &&
    timeToMinutes(b.startTime) < timeToMinutes(a.endTime);
}

export function sortSlots<T extends Pick<SlotLike, "startTime" | "endTime">>(slots: T[]) {
  return [...slots].sort((a, b) => {
    const byStart = timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    if (byStart !== 0) return byStart;
    return timeToMinutes(a.endTime) - timeToMinutes(b.endTime);
  });
}

export function findOverlappingSlots<T extends SlotLike>(
  slots: T[],
  candidate: Pick<SlotLike, "startTime" | "endTime">
) {
  return slots.filter((slot) => slotsOverlap(slot, candidate));
}

export function normalizeSlotRange(startTime: string, endTime: string) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);

  if (start < timeToMinutes("03:00") || end > timeToMinutes("20:00")) {
    throw new Error("时间必须位于 03:00-20:00。");
  }

  if (end <= start) {
    throw new Error("结束时间必须晚于开始时间。");
  }

  if (start % 30 !== 0 || end % 30 !== 0) {
    throw new Error("时间必须对齐半小时粒度。");
  }

  return { start, end };
}

export function resolveFixedSlots({
  templates,
  courseSlots,
  openAgentSlots
}: {
  templates: Array<{
    id: string;
    startTime: string;
    endTime: string;
    title: string;
    slotType: string;
    routeDomain?: string | null;
    protected: boolean;
    flexible: boolean;
    defaultRule: string;
  }>;
  courseSlots: Array<{
    id: string;
    startTime: string;
    endTime: string;
    courseName: string;
    courseCode: string;
    locked: boolean;
  }>;
  openAgentSlots: Array<{
    id: string;
    startTime: string;
    endTime: string;
    insertedTitle: string;
    reason: string;
  }>;
}): ResolvedFixedSlot[] {
  const resolved: ResolvedFixedSlot[] = templates.map((slot) => ({
    id: slot.id,
    startTime: slot.startTime,
    endTime: slot.endTime,
    title: slot.title,
    protected: slot.protected,
    flexible: slot.flexible,
    slotType: slot.slotType,
    routeDomain: slot.routeDomain,
    defaultRule: slot.defaultRule,
    source: "template"
  }));

  for (const course of courseSlots) {
    resolved.push({
      id: course.id,
      startTime: course.startTime,
      endTime: course.endTime,
      title: `${course.courseCode} ${course.courseName}`,
      protected: course.locked,
      flexible: !course.locked,
      slotType: "COURSE_SLOT",
      source: "course",
      routeDomain: null,
      defaultRule: "课程槽优先于弹性路线槽。"
    });
  }

  for (const openAgentSlot of openAgentSlots) {
    resolved.push({
      id: openAgentSlot.id,
      startTime: openAgentSlot.startTime,
      endTime: openAgentSlot.endTime,
      title: openAgentSlot.insertedTitle,
      protected: false,
      flexible: true,
      slotType: "OPEN_AGENT_SLOT",
      source: "open_agent",
      routeDomain: null,
      defaultRule: "Agent/用户插入的今日变动。",
      reason: openAgentSlot.reason
    });
  }

  return sortSlots(resolved);
}
