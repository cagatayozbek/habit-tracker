import { useMemo } from "react";
import { useSQLiteContext } from "expo-sqlite";
import { habitRepository } from "../features/habits/habit.repository";
export function useHabitRepository() {
  const db = useSQLiteContext();
  return useMemo(() => habitRepository(db), [db]);
}
