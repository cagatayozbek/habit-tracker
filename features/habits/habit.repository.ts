import type { Connection, Database } from "../../db/connection.ts";
import { assertLocalDateKey } from "../../lib/dates.ts";
import { currentTimestamp, localDateKey } from "../../lib/dates.ts";
import { sameSchedule, scheduleMatchesVersionedDate, validateSchedule } from "../../lib/schedules.ts";
import { localIdentifier } from "../../lib/ids.ts";
import type { Habit, HabitSchedule, ScheduleVersion, TodayHabit } from "./habit.types.ts";
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
  group_id: string | null;
  group_name?: string | null;
  sort_order: number;
  frequency_type: Habit["frequencyType"];
  reminder_enabled: number;
  reminder_time: string | null;
  reminder_times: string;
  follow_up_minutes: number | null;
  created_at: string;
  archived_at: string | null;
};
type TodayHabitRow = HabitRow & { completed_today: number; progress_value: number; progress_state: TodayHabit["progressState"] };
type ScheduleRow = {
  id: string; habit_id: string; schedule_type: HabitSchedule["type"]; interval_days: number | null;
  occurrences: number | null; start_date: string; end_date: string | null; effective_from: string; effective_until: string | null;
};
function legacySchedule(row: HabitRow): HabitSchedule {
  return { type: row.frequency_type === "daily" ? "daily" : "weekdays", weekdays: [], daysOfMonth: [], intervalDays: null, occurrences: null, startDate: row.created_at.slice(0, 10), endDate: null };
}
async function schedulesForHabit(db: Connection, habitId: string): Promise<ScheduleVersion[]> {
  const rows = await db.getAllAsync<ScheduleRow>("SELECT * FROM habit_schedule_versions WHERE habit_id = ? ORDER BY effective_from", habitId);
  return Promise.all(rows.map(async (row) => {
    const [weekdays, monthDays] = await Promise.all([
      db.getAllAsync<{ weekday: number }>("SELECT weekday FROM habit_schedule_version_weekdays WHERE schedule_version_id = ? ORDER BY weekday", row.id),
      db.getAllAsync<{ day_of_month: number }>("SELECT day_of_month FROM habit_schedule_version_month_days WHERE schedule_version_id = ? ORDER BY day_of_month", row.id),
    ]);
    return { id: row.id, habitId: row.habit_id, type: row.schedule_type, intervalDays: row.interval_days, occurrences: row.occurrences, startDate: row.start_date, endDate: row.end_date, effectiveFrom: row.effective_from, effectiveUntil: row.effective_until, weekdays: weekdays.map((day) => day.weekday), daysOfMonth: monthDays.map((day) => day.day_of_month) };
  }));
}
async function hydrate(db: Connection, row: HabitRow): Promise<Habit> {
  const days = await db.getAllAsync<{ weekday: number }>(
    "SELECT weekday FROM habit_schedule_days WHERE habit_id = ? ORDER BY weekday",
    row.id,
  );
  const versions = await schedulesForHabit(db, row.id);
  const current = versions.find((version) => version.effectiveUntil === null) ?? null;
  const schedule = current ?? { ...legacySchedule(row), weekdays: days.map((day) => day.weekday) };
  let reminderTimes: string[] = [];
  try { const parsed: unknown = JSON.parse(row.reminder_times ?? "[]"); if (Array.isArray(parsed)) reminderTimes = parsed.filter((value): value is string => typeof value === "string"); } catch { reminderTimes = row.reminder_time ? [row.reminder_time] : []; }
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
    groupId: row.group_id,
    groupName: row.group_name ?? null,
    sortOrder: row.sort_order,
    schedule,
    frequencyType: schedule.type === "daily" ? "daily" : "specific_days",
    scheduledDays: schedule.type === "weekdays" ? schedule.weekdays : [],
    reminderEnabled: row.reminder_enabled === 1,
    reminderTime: row.reminder_time,
    reminderTimes,
    followUpMinutes: row.follow_up_minutes,
    createdAt: row.created_at,
    archivedAt: row.archived_at,
  };
}
function normaliseSchedule(habit: Habit): HabitSchedule {
  if (habit.schedule) return habit.schedule;
  return { type: habit.frequencyType === "daily" ? "daily" : "weekdays", weekdays: habit.scheduledDays, daysOfMonth: [], intervalDays: null, occurrences: null, startDate: habit.createdAt.slice(0, 10), endDate: null };
}
async function insertSchedule(tx: Connection, habitId: string, schedule: HabitSchedule, effectiveFrom: string): Promise<void> {
  const id = localIdentifier();
  await tx.runAsync("INSERT INTO habit_schedule_versions (id, habit_id, schedule_type, interval_days, occurrences, start_date, end_date, effective_from, effective_until) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)", id, habitId, schedule.type, schedule.intervalDays, schedule.occurrences, schedule.startDate, schedule.endDate, effectiveFrom);
  for (const day of [...new Set(schedule.weekdays)].sort()) await tx.runAsync("INSERT INTO habit_schedule_version_weekdays (schedule_version_id, weekday) VALUES (?, ?)", id, day);
  for (const day of [...new Set(schedule.daysOfMonth)].sort()) await tx.runAsync("INSERT INTO habit_schedule_version_month_days (schedule_version_id, day_of_month) VALUES (?, ?)", id, day);
}
export function habitRepository(db: Database) {
  return {
    async list(includeArchived = false): Promise<Habit[]> {
      const rows = await db.getAllAsync<HabitRow>(
        `SELECT h.*, g.name AS group_name FROM habits h LEFT JOIN habit_groups g ON g.id = h.group_id ${includeArchived ? "" : "WHERE h.archived_at IS NULL"} ORDER BY h.sort_order, h.created_at, h.id`,
      );
      return Promise.all(rows.map((row) => hydrate(db, row)));
    },
    async get(id: string): Promise<Habit | null> {
      const row = await db.getFirstAsync<HabitRow>(
        "SELECT h.*, g.name AS group_name FROM habits h LEFT JOIN habit_groups g ON g.id = h.group_id WHERE h.id = ?",
        id,
      );
      return row ? hydrate(db, row) : null;
    },
    async scheduleVersions(habitId: string): Promise<ScheduleVersion[]> {
      return schedulesForHabit(db, habitId);
    },
    async listScheduledForDate(
      date: string,
      weekday: number,
    ): Promise<TodayHabit[]> {
      assertLocalDateKey(date);
      if (!Number.isInteger(weekday) || weekday < 1 || weekday > 7)
        throw new Error("Invalid weekday.");
      const candidates = await this.list();
      const scheduledIds = (await Promise.all(candidates.map(async (habit) =>
        (scheduleMatchesVersionedDate(await schedulesForHabit(db, habit.id), date) ? habit.id : null),
      ))).filter((id): id is string => id !== null);
      if (!scheduledIds.length) return [];
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
          AND h.id IN (${scheduledIds.map(() => "?").join(", ")})
        ORDER BY h.created_at, h.id`,
        date, date, date, ...scheduledIds,
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
    async save(habit: Habit, groupName: string | null = null): Promise<void> {
      if (!habit.name.trim()) throw new Error("Habit name is required.");
      if (!["check", "count", "quantity", "duration"].includes(habit.type)) throw new Error("Invalid habit type.");
      if (!["daily", "weekly", "monthly"].includes(habit.goalPeriod)) throw new Error("Invalid goal period.");
      if (!Number.isFinite(habit.targetValue) || habit.targetValue <= 0) throw new Error("Target value must be positive.");
      if (habit.type === "check" && (habit.targetValue !== 1 || habit.unit !== null)) throw new Error("Check habits have a target of one and no unit.");
      const schedule = normaliseSchedule(habit);
      validateSchedule(schedule);
      const days = schedule.type === "weekdays" ? [...new Set(schedule.weekdays)].sort() : [];
      await db.withExclusiveTransactionAsync(async (tx) => {
        let groupId = habit.groupId;
        const trimmedGroup = groupName?.trim();
        if (trimmedGroup) {
          const existingGroup = await tx.getFirstAsync<{ id: string }>("SELECT id FROM habit_groups WHERE name = ?", trimmedGroup);
          groupId = existingGroup?.id ?? localIdentifier();
          if (!existingGroup) await tx.runAsync("INSERT INTO habit_groups (id, name, created_at) VALUES (?, ?, ?)", groupId, trimmedGroup, currentTimestamp());
        }
        await tx.runAsync(
          `INSERT INTO habits (id, name, icon, color, description, habit_type, target_value, unit, goal_period, group_id, sort_order, frequency_type, reminder_enabled, reminder_time, reminder_times, follow_up_minutes, created_at, archived_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET name=excluded.name, icon=excluded.icon, color=excluded.color, description=excluded.description, habit_type=excluded.habit_type, target_value=excluded.target_value, unit=excluded.unit, goal_period=excluded.goal_period, group_id=excluded.group_id, sort_order=excluded.sort_order, frequency_type=excluded.frequency_type, reminder_enabled=excluded.reminder_enabled, reminder_time=excluded.reminder_time, reminder_times=excluded.reminder_times, follow_up_minutes=excluded.follow_up_minutes, archived_at=excluded.archived_at`,
          habit.id,
          habit.name.trim(),
          habit.icon,
          habit.color,
          habit.description,
          habit.type,
          habit.targetValue,
          habit.unit,
          habit.goalPeriod,
          groupId,
          habit.sortOrder,
          habit.frequencyType,
          Number(habit.reminderEnabled),
          habit.reminderTime,
          JSON.stringify(habit.reminderTimes ?? (habit.reminderTime ? [habit.reminderTime] : [])),
          habit.followUpMinutes ?? null,
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
        const existing = await schedulesForHabit(tx, habit.id);
        const active = existing.find((version) => version.effectiveUntil === null);
        if (!active) {
          await insertSchedule(tx, habit.id, schedule, schedule.startDate);
        } else if (!sameSchedule(active, schedule)) {
          const effectiveFrom = schedule.startDate > active.effectiveFrom ? schedule.startDate : localDateKey(new Date());
          if (effectiveFrom <= active.effectiveFrom) throw new Error("Schedule changes cannot rewrite existing schedule history.");
          const yesterday = new Date(effectiveFrom.slice(0, 4) + "-" + effectiveFrom.slice(5, 7) + "-" + effectiveFrom.slice(8, 10) + "T12:00:00");
          yesterday.setDate(yesterday.getDate() - 1);
          await tx.runAsync("UPDATE habit_schedule_versions SET effective_until = ? WHERE id = ?", localDateKey(yesterday), active.id);
          await insertSchedule(tx, habit.id, schedule, effectiveFrom);
        }
      });
    },
    async archive(id: string, archivedAt: string): Promise<void> {
      await db.runAsync(
        "UPDATE habits SET archived_at = ? WHERE id = ?",
        archivedAt,
        id,
      );
    },
    async archiveMany(ids: readonly string[], archivedAt: string): Promise<void> {
      await db.withExclusiveTransactionAsync(async (tx) => {
        for (const id of [...new Set(ids)])
          await tx.runAsync("UPDATE habits SET archived_at = ? WHERE id = ?", archivedAt, id);
      });
    },
    async reorder(ids: readonly string[]): Promise<void> {
      await db.withExclusiveTransactionAsync(async (tx) => {
        for (const [index, id] of ids.entries())
          await tx.runAsync("UPDATE habits SET sort_order = ? WHERE id = ?", index + 1, id);
      });
    },
    async delete(id: string): Promise<void> {
      await db.runAsync("DELETE FROM habits WHERE id = ?", id);
    },
  };
}
