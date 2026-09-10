import { assertLocalDateKey, localDateKey } from "./dates.ts";
import type { GoalPeriod, Habit } from "../features/habits/habit.types.ts";
import type { ProgressEntry, ProgressState } from "../features/completions/completion.types.ts";

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
