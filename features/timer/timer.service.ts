import type { Connection } from "../../db/connection.ts";

export interface HabitTimer {
  habitId: string;
  startedAt: string | null;
  accumulatedSeconds: number;
}

type TimerRow = {
  habit_id: string;
  started_at: string | null;
  accumulated_seconds: number;
};

function elapsedSeconds(startedAt: string, now: string): number {
  const elapsed = (Date.parse(now) - Date.parse(startedAt)) / 1000;
  if (!Number.isFinite(elapsed) || elapsed < 0) throw new Error("Invalid timer timestamp.");
  return elapsed;
}

/** One persistent timer is shared by Today and App Intents. Wall-clock timestamps survive suspension. */
export function timerService(db: Connection) {
  const get = async (): Promise<HabitTimer | null> => {
    const row = await db.getFirstAsync<TimerRow>("SELECT habit_id, started_at, accumulated_seconds FROM habit_timer WHERE singleton_id = 1");
    return row ? { habitId: row.habit_id, startedAt: row.started_at, accumulatedSeconds: row.accumulated_seconds } : null;
  };
  return {
    get,
    async start(habitId: string, now: string): Promise<HabitTimer> {
      const habit = await db.getFirstAsync<{ habit_type: string; archived_at: string | null }>("SELECT habit_type, archived_at FROM habits WHERE id = ?", habitId);
      if (!habit || habit.archived_at !== null) throw new Error("Habit is unavailable.");
      if (habit.habit_type !== "duration") throw new Error("Only duration habits can start a timer.");
      const active = await get();
      if (active?.startedAt) {
        if (active.habitId === habitId) return active;
        throw new Error("Another habit timer is already running.");
      }
      const accumulated = active?.habitId === habitId ? active.accumulatedSeconds : 0;
      await db.runAsync("INSERT INTO habit_timer (singleton_id, habit_id, started_at, accumulated_seconds) VALUES (1, ?, ?, ?) ON CONFLICT(singleton_id) DO UPDATE SET habit_id=excluded.habit_id, started_at=excluded.started_at, accumulated_seconds=excluded.accumulated_seconds", habitId, now, accumulated);
      return { habitId, startedAt: now, accumulatedSeconds: accumulated };
    },
    async pause(now: string): Promise<HabitTimer | null> {
      const active = await get();
      if (!active?.startedAt) return active;
      const accumulatedSeconds = active.accumulatedSeconds + elapsedSeconds(active.startedAt, now);
      await db.runAsync("UPDATE habit_timer SET started_at = NULL, accumulated_seconds = ? WHERE singleton_id = 1", accumulatedSeconds);
      return { ...active, startedAt: null, accumulatedSeconds };
    },
    async clear(): Promise<void> { await db.runAsync("DELETE FROM habit_timer WHERE singleton_id = 1"); },
  };
}
