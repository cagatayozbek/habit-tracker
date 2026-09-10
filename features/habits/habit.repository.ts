import type { Connection, Database } from "../../db/connection.ts";
import { assertLocalDateKey } from "../../lib/dates.ts";
import type { Habit, TodayHabit } from "./habit.types.ts";
type HabitRow = {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string | null;
  habit_type: Habit["type"];
  target_value: number;
  unit: string | null;
  goal_period: Habit["goalPeriod"];
  frequency_type: Habit["frequencyType"];
  reminder_enabled: number;
  reminder_time: string | null;
  created_at: string;
  archived_at: string | null;
};
type TodayHabitRow = HabitRow & { completed_today: number; progress_value: number; progress_state: TodayHabit["progressState"] };
async function hydrate(db: Connection, row: HabitRow): Promise<Habit> {
  const days = await db.getAllAsync<{ weekday: number }>(
    "SELECT weekday FROM habit_schedule_days WHERE habit_id = ? ORDER BY weekday",
    row.id,
  );
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    description: row.description,
    type: row.habit_type,
    targetValue: row.target_value,
    unit: row.unit,
    goalPeriod: row.goal_period,
    frequencyType: row.frequency_type,
    scheduledDays: days.map((day) => day.weekday),
    reminderEnabled: row.reminder_enabled === 1,
    reminderTime: row.reminder_time,
    createdAt: row.created_at,
    archivedAt: row.archived_at,
  };
}
export function habitRepository(db: Database) {
  return {
    async list(includeArchived = false): Promise<Habit[]> {
      const rows = await db.getAllAsync<HabitRow>(
        `SELECT * FROM habits ${includeArchived ? "" : "WHERE archived_at IS NULL"} ORDER BY created_at, id`,
      );
      return Promise.all(rows.map((row) => hydrate(db, row)));
    },
    async get(id: string): Promise<Habit | null> {
      const row = await db.getFirstAsync<HabitRow>(
        "SELECT * FROM habits WHERE id = ?",
        id,
      );
      return row ? hydrate(db, row) : null;
    },
    async listScheduledForDate(
      date: string,
      weekday: number,
    ): Promise<TodayHabit[]> {
      assertLocalDateKey(date);
      if (!Number.isInteger(weekday) || weekday < 1 || weekday > 7)
        throw new Error("Invalid weekday.");
      const rows = await db.getAllAsync<TodayHabitRow>(
        `SELECT h.*,
          EXISTS (
            SELECT 1 FROM progress_entries p
            WHERE p.habit_id = h.id AND p.local_date = ? AND p.state = 'completed'
          ) AS completed_today
          ,COALESCE((SELECT value FROM progress_entries p WHERE p.habit_id = h.id AND p.local_date = ?), 0) AS progress_value
          ,(SELECT state FROM progress_entries p WHERE p.habit_id = h.id AND p.local_date = ?) AS progress_state
        FROM habits h
        WHERE h.archived_at IS NULL
          AND (
            h.frequency_type = 'daily'
            OR EXISTS (
              SELECT 1 FROM habit_schedule_days s
              WHERE s.habit_id = h.id AND s.weekday = ?
            )
          )
        ORDER BY h.created_at, h.id`,
        date, date, date,
        weekday,
      );
      return Promise.all(
        rows.map(async (row) => ({
          ...(await hydrate(db, row)),
          completedToday: row.completed_today === 1,
          progressValue: row.progress_value,
          progressState: row.progress_state,
        })),
      );
    },
    async save(habit: Habit): Promise<void> {
      if (!habit.name.trim()) throw new Error("Habit name is required.");
      if (!["check", "count", "quantity", "duration"].includes(habit.type)) throw new Error("Invalid habit type.");
      if (!["daily", "weekly", "monthly"].includes(habit.goalPeriod)) throw new Error("Invalid goal period.");
      if (!Number.isFinite(habit.targetValue) || habit.targetValue <= 0) throw new Error("Target value must be positive.");
      if (habit.type === "check" && (habit.targetValue !== 1 || habit.unit !== null)) throw new Error("Check habits have a target of one and no unit.");
      if (
        habit.frequencyType !== "daily" &&
        habit.frequencyType !== "specific_days"
      )
        throw new Error("Invalid frequency.");
      const days = [...new Set(habit.scheduledDays)].sort();
      if (
        days.some((day) => !Number.isInteger(day) || day < 1 || day > 7) ||
        (habit.frequencyType === "specific_days" && !days.length) ||
        (habit.frequencyType === "daily" && days.length)
      )
        throw new Error("Invalid schedule.");
      await db.withExclusiveTransactionAsync(async (tx) => {
        await tx.runAsync(
          `INSERT INTO habits (id, name, icon, color, description, habit_type, target_value, unit, goal_period, frequency_type, reminder_enabled, reminder_time, created_at, archived_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET name=excluded.name, icon=excluded.icon, color=excluded.color, description=excluded.description, habit_type=excluded.habit_type, target_value=excluded.target_value, unit=excluded.unit, goal_period=excluded.goal_period, frequency_type=excluded.frequency_type, reminder_enabled=excluded.reminder_enabled, reminder_time=excluded.reminder_time, archived_at=excluded.archived_at`,
          habit.id,
          habit.name.trim(),
          habit.icon,
          habit.color,
          habit.description,
          habit.type,
          habit.targetValue,
          habit.unit,
          habit.goalPeriod,
          habit.frequencyType,
          Number(habit.reminderEnabled),
          habit.reminderTime,
          habit.createdAt,
          habit.archivedAt,
        );
        await tx.runAsync(
          "DELETE FROM habit_schedule_days WHERE habit_id = ?",
          habit.id,
        );
        for (const day of days)
          await tx.runAsync(
            "INSERT INTO habit_schedule_days (habit_id, weekday) VALUES (?, ?)",
            habit.id,
            day,
          );
      });
    },
    async archive(id: string, archivedAt: string): Promise<void> {
      await db.runAsync(
        "UPDATE habits SET archived_at = ? WHERE id = ?",
        archivedAt,
        id,
      );
    },
    async delete(id: string): Promise<void> {
      await db.runAsync("DELETE FROM habits WHERE id = ?", id);
    },
  };
}
