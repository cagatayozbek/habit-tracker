import type { Connection } from "../../db/connection.ts";
import { assertLocalDateKey } from "../../lib/dates.ts";
import type { HabitCompletion } from "./completion.types.ts";
export function completionRepository(db: Connection) {
  return {
    async list(habitId: string): Promise<HabitCompletion[]> {
      return db.getAllAsync<HabitCompletion>(
        "SELECT id, habit_id AS habitId, completion_date AS completionDate, completed_at AS completedAt FROM habit_completions WHERE habit_id = ? ORDER BY completion_date",
        habitId,
      );
    },
    async add(completion: HabitCompletion): Promise<void> {
      assertLocalDateKey(completion.completionDate);
      await db.runAsync(
        "INSERT INTO habit_completions (id, habit_id, completion_date, completed_at) VALUES (?, ?, ?, ?) ON CONFLICT(habit_id, completion_date) DO NOTHING",
        completion.id,
        completion.habitId,
        completion.completionDate,
        completion.completedAt,
      );
    },
    async remove(habitId: string, date: string): Promise<void> {
      assertLocalDateKey(date);
      await db.runAsync(
        "DELETE FROM habit_completions WHERE habit_id = ? AND completion_date = ?",
        habitId,
        date,
      );
    },
  };
}
