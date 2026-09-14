import { useMemo } from "react";
import { useSQLiteContext } from "expo-sqlite";
import { timerService } from "../features/timer/timer.service";

export function useTimerService() {
  const db = useSQLiteContext();
  return useMemo(() => timerService(db), [db]);
}
