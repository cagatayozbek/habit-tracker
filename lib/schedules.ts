import { assertLocalDateKey, localDateKey, localWeekday } from "./dates.ts";
import type { HabitSchedule, ScheduleVersion } from "../features/habits/habit.types.ts";

function dateAtNoon(key: string): Date {
  assertLocalDateKey(key);
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

export function shiftLocalDate(key: string, days: number): string {
  const value = dateAtNoon(key);
  value.setDate(value.getDate() + days);
  return localDateKey(value);
}

export function scheduleForDate<T extends ScheduleVersion>(versions: readonly T[], date: string): T | null {
  assertLocalDateKey(date);
  return versions.find((version) => version.effectiveFrom <= date && (!version.effectiveUntil || date <= version.effectiveUntil)) ?? null;
}

export function validateSchedule(schedule: HabitSchedule): void {
  assertLocalDateKey(schedule.startDate);
  if (schedule.endDate !== null) {
    assertLocalDateKey(schedule.endDate);
    if (schedule.endDate < schedule.startDate) throw new Error("Schedule end date must not precede its start date.");
  }
  const weekdays = [...new Set(schedule.weekdays)];
  const monthDays = [...new Set(schedule.daysOfMonth)];
  if (weekdays.some((day) => !Number.isInteger(day) || day < 1 || day > 7)) throw new Error("Invalid schedule weekdays.");
  if (monthDays.some((day) => !Number.isInteger(day) || day < 1 || day > 31)) throw new Error("Invalid schedule month days.");
  if (schedule.type === "weekdays" && weekdays.length === 0) throw new Error("Weekday schedules need at least one day.");
  if (schedule.type === "days_of_month" && monthDays.length === 0) throw new Error("Month-day schedules need at least one day.");
  if (schedule.type === "interval" && (!Number.isInteger(schedule.intervalDays) || (schedule.intervalDays ?? 0) < 1)) throw new Error("Interval schedules need a positive interval.");
  if (["times_per_week", "times_per_month"].includes(schedule.type) && (!Number.isInteger(schedule.occurrences) || (schedule.occurrences ?? 0) < 1)) throw new Error("Occurrence schedules need a positive count.");
  if (schedule.type !== "interval" && schedule.intervalDays !== null) throw new Error("Only interval schedules have an interval.");
  if (!["times_per_week", "times_per_month"].includes(schedule.type) && schedule.occurrences !== null) throw new Error("Only occurrence schedules have an occurrence count.");
}

/** Whether this schedule is available on a date. X/week and X/month are available daily; their quota is evaluated by period. */
export function scheduleMatchesDate(schedule: HabitSchedule, date: string): boolean {
  validateSchedule(schedule); assertLocalDateKey(date);
  if (date < schedule.startDate || (schedule.endDate && date > schedule.endDate)) return false;
  const value = dateAtNoon(date);
  switch (schedule.type) {
    case "daily": case "times_per_week": case "times_per_month": return true;
    case "weekdays": return schedule.weekdays.includes(localWeekday(value));
    case "days_of_month": return schedule.daysOfMonth.includes(value.getDate());
    case "interval": {
      const delta = Math.round((dateAtNoon(date).getTime() - dateAtNoon(schedule.startDate).getTime()) / 86_400_000);
      return delta >= 0 && delta % schedule.intervalDays! === 0;
    }
  }
}

export function scheduleMatchesVersionedDate(versions: readonly ScheduleVersion[], date: string): boolean {
  const version = scheduleForDate(versions, date);
  return version ? scheduleMatchesDate(version, date) : false;
}

/** Counts expected occurrences, including partial calendar periods at the range boundaries. */
export function expectedOccurrences(schedule: HabitSchedule, start: string, end: string): number {
  assertLocalDateKey(start); assertLocalDateKey(end); if (end < start) return 0;
  if (schedule.type === "times_per_week" || schedule.type === "times_per_month") {
    const periods = new Set<string>();
    for (let date = start; date <= end; date = shiftLocalDate(date, 1)) {
      if (!scheduleMatchesDate(schedule, date)) continue;
      const value = dateAtNoon(date);
      periods.add(schedule.type === "times_per_week" ? shiftLocalDate(date, -(localWeekday(value) - 1)) : date.slice(0, 7));
    }
    return periods.size * schedule.occurrences!;
  }
  let count = 0;
  for (let date = start; date <= end; date = shiftLocalDate(date, 1)) if (scheduleMatchesDate(schedule, date)) count += 1;
  return count;
}

export function sameSchedule(left: HabitSchedule, right: HabitSchedule): boolean {
  return left.type === right.type && left.intervalDays === right.intervalDays && left.occurrences === right.occurrences && left.startDate === right.startDate && left.endDate === right.endDate && [...left.weekdays].sort().join(",") === [...right.weekdays].sort().join(",") && [...left.daysOfMonth].sort().join(",") === [...right.daysOfMonth].sort().join(",");
}
