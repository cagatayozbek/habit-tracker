import type { Habit } from "../features/habits/habit.types.ts";

export type AppIntentCommand = "complete" | "add-progress" | "start-timer";

export function resolveIntentHabit(habits: readonly Habit[], query: string): Habit | null {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return null;
  return habits.find((habit) => habit.archivedAt === null && (habit.id === query || habit.name.toLocaleLowerCase() === normalized)) ?? null;
}

export function intentProgressValue(habit: Pick<Habit, "type" | "targetValue">, current: number, command: Exclude<AppIntentCommand, "start-timer">, amount?: number): number {
  if (command === "complete") return habit.targetValue;
  if (habit.type === "check") throw new Error("Progress can only be added to count, quantity, or duration habits.");
  if (!Number.isFinite(amount) || (amount ?? 0) <= 0) throw new Error("Progress amount must be positive.");
  return current + (amount as number);
}
