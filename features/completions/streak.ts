import { assertLocalDateKey, localDateKey, localWeekday } from "../../lib/dates.ts";
import type { FrequencyType } from "../habits/habit.types.ts";

export interface StreakSchedule {
  frequencyType: FrequencyType;
  scheduledDays: number[];
}

export interface StreakResult {
  current: number;
  longest: number;
}

function dateFromKey(key: string): Date {
  assertLocalDateKey(key);
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function dateAfter(key: string, days: number): string {
  const date = dateFromKey(key);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

function isScheduled(schedule: StreakSchedule, key: string): boolean {
  if (schedule.frequencyType === "daily") return true;
  return schedule.scheduledDays.includes(localWeekday(dateFromKey(key)));
}

function validateSchedule(schedule: StreakSchedule): void {
  if (schedule.frequencyType !== "daily" && schedule.frequencyType !== "specific_days")
    throw new Error("Invalid frequency.");
  if (
    schedule.scheduledDays.some((day) => !Number.isInteger(day) || day < 1 || day > 7) ||
    (schedule.frequencyType === "specific_days" && schedule.scheduledDays.length === 0) ||
    (schedule.frequencyType === "daily" && schedule.scheduledDays.length > 0)
  )
    throw new Error("Invalid schedule.");
}

/**
 * Calculates streaks from local calendar identities. An incomplete occurrence
 * on the reference date is deliberately ignored until the day has passed.
 */
export function calculateStreaks(
  schedule: StreakSchedule,
  completionDates: readonly string[],
  referenceDate: string,
): StreakResult {
  validateSchedule(schedule);
  assertLocalDateKey(referenceDate);

  const completions = new Set<string>();
  for (const date of completionDates) {
    assertLocalDateKey(date);
    if (date <= referenceDate && isScheduled(schedule, date)) completions.add(date);
  }
  const ordered = [...completions].sort();
  if (ordered.length === 0) return { current: 0, longest: 0 };

  let longest = 0;
  let run = 0;
  let cursor = ordered[0];
  const lastCompletion = ordered.at(-1)!;
  while (cursor <= lastCompletion) {
    if (isScheduled(schedule, cursor)) {
      run = completions.has(cursor) ? run + 1 : 0;
      longest = Math.max(longest, run);
    }
    cursor = dateAfter(cursor, 1);
  }

  let current = 0;
  cursor = referenceDate;
  while (cursor >= ordered[0]) {
    if (isScheduled(schedule, cursor)) {
      if (cursor === referenceDate && !completions.has(cursor)) {
        cursor = dateAfter(cursor, -1);
        continue;
      }
      if (!completions.has(cursor)) break;
      current += 1;
    }
    cursor = dateAfter(cursor, -1);
  }
  return { current, longest };
}
