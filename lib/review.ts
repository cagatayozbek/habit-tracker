import type { ProgressEntry } from "../features/completions/completion.types.ts";
import type { Habit, ScheduleVersion } from "../features/habits/habit.types.ts";
import { evaluateScheduledGoal, goalPeriodBounds, targetCompletionPercentage } from "./goals.ts";

export interface HabitReview {
  habit: Habit;
  value: number;
  total: number;
  percentage: number;
  state: string;
  completedPeriods: number;
}

export interface WeeklyRecap {
  percentage: number;
  change: number;
  achieved: number;
  total: number;
  mostConsistent: string | null;
  mostMissed: string | null;
}

/** Deterministic, schedule-version-aware review metrics from canonical progress facts. */
export function buildReview(
  habits: readonly Habit[], entriesByHabit: ReadonlyMap<string, readonly ProgressEntry[]>, versionsByHabit: ReadonlyMap<string, readonly ScheduleVersion[]>, referenceDate: string,
): { habits: HabitReview[]; recap: WeeklyRecap } {
  const active = habits.filter((habit) => !habit.archivedAt);
  const reviewed = active.map((habit) => {
    const entries = entriesByHabit.get(habit.id) ?? [];
    const goal = evaluateScheduledGoal(habit, versionsByHabit.get(habit.id) ?? [], entries, referenceDate);
    const total = entries.reduce((sum, entry) => sum + entry.value, 0);
    return { habit, value: goal.value, total, percentage: goal.percentage, state: goal.state, completedPeriods: entries.filter((entry) => entry.state === "completed").length };
  });
  const bounds = goalPeriodBounds(referenceDate, "weekly");
  const priorEnd = new Date(`${bounds.start}T12:00:00`); priorEnd.setDate(priorEnd.getDate() - 1);
  const priorStart = new Date(priorEnd); priorStart.setDate(priorStart.getDate() - 6);
  const key = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const scores = (start: string, end: string) => active.map((habit) => targetCompletionPercentage((entriesByHabit.get(habit.id) ?? []).filter((entry) => entry.localDate >= start && entry.localDate <= end).reduce((sum, entry) => sum + entry.value, 0), habit.targetValue));
  const now = scores(bounds.start, bounds.end); const before = scores(key(priorStart), key(priorEnd));
  const average = (values: readonly number[]) => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
  const best = [...reviewed].sort((a, b) => b.percentage - a.percentage)[0];
  const missed = [...reviewed].sort((a, b) => a.percentage - b.percentage)[0];
  return { habits: reviewed, recap: { percentage: average(now), change: average(now) - average(before), achieved: reviewed.filter((item) => item.state === "completed").length, total: reviewed.length, mostConsistent: best?.habit.name ?? null, mostMissed: missed?.habit.name ?? null } };
}
