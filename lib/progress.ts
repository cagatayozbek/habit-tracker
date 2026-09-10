import type { Habit } from "../features/habits/habit.types.ts";
import { assertLocalDateKey, localDateKey, localWeekday } from "./dates.ts";

export function completionPercentage(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((Math.max(0, Math.min(completed, total)) / total) * 100);
}

export interface HeatmapDay {
  date: string;
  level: 0 | 1 | 2 | 3 | 4;
  expected: number;
  completed: number;
}

export interface ProgressSummary {
  week: { completed: number; expected: number; percentage: number };
  month: { completed: number; expected: number; percentage: number };
  currentStreak: number;
  bestStreak: number;
  heatmap: HeatmapDay[];
  habits: Array<{ habit: Habit; completed: number; expected: number; percentage: number }>;
}

function fromKey(key: string): Date {
  assertLocalDateKey(key);
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function shift(key: string, amount: number): string {
  const date = fromKey(key);
  date.setDate(date.getDate() + amount);
  return localDateKey(date);
}

function scheduled(habit: Habit, date: string): boolean {
  return habit.frequencyType === "daily" || habit.scheduledDays.includes(localWeekday(fromKey(date)));
}

function level(expected: number, completed: number): HeatmapDay["level"] {
  if (expected === 0) return 0;
  if (completed === 0) return 1;
  if (completed === expected) return 4;
  return completed / expected >= 0.5 ? 3 : 2;
}

/** Derives dashboard metrics from local-date completion identities. */
export function calculateProgress(
  habits: readonly Habit[],
  completionDatesByHabit: ReadonlyMap<string, readonly string[]>,
  referenceDate: string,
): ProgressSummary {
  assertLocalDateKey(referenceDate);
  const active = habits.filter((habit) => habit.archivedAt === null);
  const completions = new Map<string, Set<string>>(
    active.map((habit) => [habit.id, new Set(completionDatesByHabit.get(habit.id) ?? [])]),
  );
  const today = fromKey(referenceDate);
  const mondayOffset = localWeekday(today) - 1;
  const weekStart = shift(referenceDate, -mondayOffset);
  const monthStart = `${referenceDate.slice(0, 7)}-01`;
  const week = { completed: 0, expected: 0, percentage: 0 };
  const month = { completed: 0, expected: 0, percentage: 0 };
  const heatmap: HeatmapDay[] = [];
  const end = shift(referenceDate, 7 - localWeekday(today));
  const start = shift(end, -(26 * 7 - 1));
  let currentStreak = 0;
  let bestStreak = 0;
  let streak = 0;

  for (let date = start; date <= end; date = shift(date, 1)) {
    const pastOrToday = date <= referenceDate;
    const expectedHabits = pastOrToday ? active.filter((habit) => scheduled(habit, date)) : [];
    const completed = expectedHabits.filter((habit) => completions.get(habit.id)?.has(date)).length;
    if (date >= weekStart && pastOrToday) {
      week.expected += expectedHabits.length;
      week.completed += completed;
    }
    if (date >= monthStart && pastOrToday) {
      month.expected += expectedHabits.length;
      month.completed += completed;
    }
    heatmap.push({ date, expected: expectedHabits.length, completed, level: level(expectedHabits.length, completed) });
    if (date < referenceDate && expectedHabits.length > 0) {
      streak = completed === expectedHabits.length ? streak + 1 : 0;
      bestStreak = Math.max(bestStreak, streak);
    }
  }
  for (let date = shift(referenceDate, -1); date >= start; date = shift(date, -1)) {
    const expected = active.filter((habit) => scheduled(habit, date));
    if (expected.length === 0) continue;
    if (!expected.every((habit) => completions.get(habit.id)?.has(date))) break;
    currentStreak += 1;
  }
  week.percentage = completionPercentage(week.completed, week.expected);
  month.percentage = completionPercentage(month.completed, month.expected);
  return {
    week,
    month,
    currentStreak,
    bestStreak,
    heatmap,
    habits: active.map((habit) => {
      let completed = 0;
      let expected = 0;
      for (let date = monthStart; date <= referenceDate; date = shift(date, 1)) {
        if (!scheduled(habit, date)) continue;
        expected += 1;
        if (completions.get(habit.id)?.has(date)) completed += 1;
      }
      return { habit, completed, expected, percentage: completionPercentage(completed, expected) };
    }),
  };
}
