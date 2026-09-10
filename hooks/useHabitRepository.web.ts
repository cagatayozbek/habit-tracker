import type { habitRepository } from "../features/habits/habit.repository";
export function useHabitRepository(): ReturnType<typeof habitRepository> {
  throw new Error("Habit storage is available in the iOS app.");
}
