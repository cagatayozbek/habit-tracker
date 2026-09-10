import type { Connection } from "../../db/connection.ts";
import { assertLocalDateKey } from "../../lib/dates.ts";
import type { HabitCompletion, ProgressEntry, ProgressState } from "./completion.types.ts";
import { progressStateForValue } from "../../lib/goals.ts";
export function completionRepository(db: Connection) {
  return {
    async list(habitId: string): Promise<HabitCompletion[]> {
      return db.getAllAsync<HabitCompletion>(
        "SELECT id, habit_id AS habitId, local_date AS completionDate, recorded_at AS completedAt FROM progress_entries WHERE habit_id = ? AND state = 'completed' ORDER BY local_date",
        habitId,
      );
    },
    async add(completion: HabitCompletion): Promise<void> {
      assertLocalDateKey(completion.completionDate);
      await db.runAsync(
        `INSERT INTO progress_entries (id, habit_id, local_date, value, state, recorded_at, note)
         VALUES (?, ?, ?, 1, 'completed', ?, NULL)
         ON CONFLICT(habit_id, local_date) DO UPDATE SET value=1, state='completed', recorded_at=excluded.recorded_at, note=NULL`,
        completion.id,
        completion.habitId,
        completion.completionDate,
        completion.completedAt,
      );
    },
    async remove(habitId: string, date: string): Promise<void> {
      assertLocalDateKey(date);
      await db.runAsync(
        "DELETE FROM progress_entries WHERE habit_id = ? AND local_date = ?",
        habitId,
        date,
      );
    },
  };
}

export function progressRepository(db: Connection) {
  return {
    async list(habitId: string): Promise<ProgressEntry[]> {
      return db.getAllAsync<ProgressEntry>(
        "SELECT id, habit_id AS habitId, local_date AS localDate, value, state, recorded_at AS recordedAt, note FROM progress_entries WHERE habit_id = ? ORDER BY local_date",
        habitId,
      );
    },
    async save(entry: ProgressEntry, targetValue: number): Promise<void> {
      assertLocalDateKey(entry.localDate);
      const state = progressStateForValue(entry.value, targetValue, entry.state);
      await db.runAsync(
        `INSERT INTO progress_entries (id, habit_id, local_date, value, state, recorded_at, note)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(habit_id, local_date) DO UPDATE SET value=excluded.value, state=excluded.state, recorded_at=excluded.recorded_at, note=excluded.note`,
        entry.id, entry.habitId, entry.localDate, entry.value, state, entry.recordedAt, entry.note,
      );
    },
    async setState(habitId: string, localDate: string, state: Extract<ProgressState, "failed" | "skipped">, id: string, recordedAt: string, note: string | null = null): Promise<void> {
      assertLocalDateKey(localDate);
      await db.runAsync(
        `INSERT INTO progress_entries (id, habit_id, local_date, value, state, recorded_at, note)
         VALUES (?, ?, ?, 0, ?, ?, ?)
         ON CONFLICT(habit_id, local_date) DO UPDATE SET state=excluded.state, recorded_at=excluded.recorded_at, note=excluded.note`,
        id, habitId, localDate, state, recordedAt, note,
      );
    },
    async remove(habitId: string, localDate: string): Promise<void> {
      assertLocalDateKey(localDate);
      await db.runAsync("DELETE FROM progress_entries WHERE habit_id = ? AND local_date = ?", habitId, localDate);
    },
  };
}
