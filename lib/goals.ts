import { assertLocalDateKey, localDateKey } from "./dates.ts";
import type { GoalPeriod, Habit } from "../features/habits/habit.types.ts";
import type { ProgressEntry, ProgressState } from "../features/completions/completion.types.ts";
import type { HabitSchedule, ScheduleVersion } from "../features/habits/habit.types.ts";
import { expectedOccurrences, scheduleForDate, shiftLocalDate } from "./schedules.ts";

function dateAtNoon(key: string): Date {
  assertLocalDateKey(key);
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

/** Local-date bounds; weekly periods start Monday. */
export function goalPeriodBounds(date: string, period: GoalPeriod): { start: string; end: string } {
  const value = dateAtNoon(date);
  if (period === "daily") return { start: date, end: date };
  if (period === "weekly") {
    const offset = (value.getDay() + 6) % 7;
    value.setDate(value.getDate() - offset);
    const start = localDateKey(value);
    value.setDate(value.getDate() + 6);
    return { start, end: localDateKey(value) };
  }
  value.setDate(1);
  const start = localDateKey(value);
  value.setMonth(value.getMonth() + 1, 0);
  return { start, end: localDateKey(value) };
}

export function progressStateForValue(value: number, targetValue: number, explicit?: ProgressState): ProgressState {
  if (!Number.isFinite(value) || value < 0 || !Number.isFinite(targetValue) || targetValue <= 0)
    throw new Error("Progress and target values must be non-negative finite values; target must be positive.");
  if (explicit === "failed" || explicit === "skipped") return explicit;
  return value >= targetValue ? "completed" : "active";
}

export function targetCompletionPercentage(value: number, targetValue: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(targetValue) || targetValue <= 0) return 0;
  return Math.round(Math.max(0, Math.min(value / targetValue, 1)) * 100);
}

export function evaluateGoal(habit: Pick<Habit, "targetValue" | "goalPeriod">, entries: readonly ProgressEntry[], date: string) {
  const bounds = goalPeriodBounds(date, habit.goalPeriod);
  const relevant = entries.filter((entry) => entry.localDate >= bounds.start && entry.localDate <= bounds.end);
  const value = relevant.reduce((total, entry) => total + entry.value, 0);
  const terminal = relevant.find((entry) => entry.state === "failed" || entry.state === "skipped")?.state;
  const state = terminal ?? progressStateForValue(value, habit.targetValue);
  return { ...bounds, value, state, percentage: targetCompletionPercentage(value, habit.targetValue) };
}

/** Uses the schedule version applicable to each historical day; schedule edits cannot alter past expectations. */
export function expectedScheduledOccurrences(versions: readonly ScheduleVersion[], start: string, end: string): number {
  let total = 0;
  for (const version of versions) {
    const sliceStart = version.effectiveFrom > start ? version.effectiveFrom : start;
    const sliceEnd = version.effectiveUntil && version.effectiveUntil < end ? version.effectiveUntil : end;
    if (sliceStart <= sliceEnd) total += expectedOccurrences(version, sliceStart, sliceEnd);
  }
  return total;
}

export function evaluateScheduledGoal(
  habit: Pick<Habit, "targetValue" | "goalPeriod">,
  versions: readonly ScheduleVersion[],
  entries: readonly ProgressEntry[],
  date: string,
) {
  const goal = evaluateGoal(habit, entries, date);
  return { ...goal, expectedOccurrences: expectedScheduledOccurrences(versions, goal.start, goal.end) };
}

export interface GoalStreakResult { current: number; longest: number; }

/**
 * A rich-habit streak counts completed goal periods that have at least one
 * expected occurrence. The in-progress reference period is not a miss.
 */
export function calculateGoalStreaks(
  habit: Pick<Habit, "targetValue" | "goalPeriod">,
  versions: readonly ScheduleVersion[],
  entries: readonly ProgressEntry[],
  referenceDate: string,
): GoalStreakResult {
  assertLocalDateKey(referenceDate);
  if (!versions.length) return { current: 0, longest: 0 };
  const first = versions.map((version) => version.effectiveFrom).sort()[0];
  const periods: Array<{ start: string; end: string; completed: boolean }> = [];
  let cursor = goalPeriodBounds(first, habit.goalPeriod).start;
  while (cursor <= referenceDate) {
    const bounds = goalPeriodBounds(cursor, habit.goalPeriod);
    if (expectedScheduledOccurrences(versions, bounds.start, bounds.end) > 0 && bounds.end < referenceDate) {
      periods.push({ ...bounds, completed: evaluateGoal(habit, entries, cursor).state === "completed" });
    }
    cursor = shiftLocalDate(bounds.end, 1);
  }
  let longest = 0; let run = 0;
  for (const period of periods) { run = period.completed ? run + 1 : 0; longest = Math.max(longest, run); }
  let current = 0;
  for (const period of [...periods].reverse()) { if (!period.completed) break; current += 1; }
  return { current, longest };
}
