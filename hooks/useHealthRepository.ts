import { useMemo } from "react";
import { useSQLiteContext } from "expo-sqlite";
import { healthRepository } from "../features/health/health.repository";
export function useHealthRepository() {
  const db = useSQLiteContext();
  return useMemo(() => healthRepository(db), [db]);
}
