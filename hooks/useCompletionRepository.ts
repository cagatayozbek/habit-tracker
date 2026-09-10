import { useMemo } from "react";
import { useSQLiteContext } from "expo-sqlite";
import { completionRepository } from "../features/completions/completion.repository";

export function useCompletionRepository() {
  const db = useSQLiteContext();
  return useMemo(() => completionRepository(db), [db]);
}
