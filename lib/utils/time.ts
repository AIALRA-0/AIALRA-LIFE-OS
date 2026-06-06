export type TimeSlot = {
  start: string;
  end: string;
};

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function timeToMinutes(time: string): number {
  const match = TIME_RE.exec(time);
  if (!match) {
    throw new Error(`Invalid HH:mm time: ${time}`);
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

export function minutesToTime(minutes: number): string {
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 24 * 60) {
    throw new Error(`Invalid minute value: ${minutes}`);
  }

  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function isHalfHourAligned(time: string): boolean {
  return timeToMinutes(time) % 30 === 0;
}

export function buildHalfHourSlots(start = "03:00", end = "20:00"): TimeSlot[] {
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);

  if (endMinutes <= startMinutes) {
    throw new Error("End time must be after start time.");
  }

  const slots: TimeSlot[] = [];
  for (let cursor = startMinutes; cursor < endMinutes; cursor += 30) {
    slots.push({
      start: minutesToTime(cursor),
      end: minutesToTime(cursor + 30)
    });
  }
  return slots;
}

export function getCurrentPlanSlot(now = new Date(), start = "03:00", end = "20:00") {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);

  if (minutes < startMinutes) {
    return { state: "before_day" as const, slot: null };
  }

  if (minutes >= endMinutes) {
    return { state: "after_day" as const, slot: null };
  }

  const slotStart = Math.floor((minutes - startMinutes) / 30) * 30 + startMinutes;
  return {
    state: "active" as const,
    slot: {
      start: minutesToTime(slotStart),
      end: minutesToTime(slotStart + 30)
    }
  };
}

export function dateOnly(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function toDateAtUtcMidnight(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

export function calculateCompletionRate(statuses: string[]): number {
  if (statuses.length === 0) {
    return 0;
  }

  const score = statuses.reduce((sum, status) => {
    if (status === "COMPLETED") return sum + 1;
    if (status === "PARTIAL") return sum + 0.5;
    return sum;
  }, 0);

  return score / statuses.length;
}
