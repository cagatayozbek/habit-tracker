import { useMemo } from "react";
import { useSQLiteContext } from "expo-sqlite";
import { progressRepository } from "../features/completions/completion.repository";

/** Canonical API for partial, historical and terminal-state progress editing. */
export function useProgressRepository() {
  const db = useSQLiteContext();
  return useMemo(() => progressRepository(db), [db]);
}
