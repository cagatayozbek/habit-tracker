import type { Database, Connection, SqlValue } from "../../db/connection";

export const BACKUP_FORMAT = "habit-tracker-backup" as const;
export const BACKUP_VERSION = 3 as const;
const tables = ["habits", "habit_groups", "habit_schedule_days", "habit_schedule_versions", "habit_schedule_version_weekdays", "habit_schedule_version_month_days", "habit_completions", "progress_entries", "habit_timer", "habit_health_mappings", "habit_health_values", "sync_state"] as const;
const restoreOrder: Table[] = ["habit_groups", "habits", "habit_schedule_days", "habit_schedule_versions", "habit_schedule_version_weekdays", "habit_schedule_version_month_days", "habit_completions", "progress_entries", "habit_timer", "habit_health_mappings", "habit_health_values", "sync_state"];
type Table = typeof tables[number];
type Row = Record<string, SqlValue>;
const columns: Record<Table, readonly string[]> = {
  habits: ["id", "name", "icon", "color", "frequency_type", "reminder_enabled", "reminder_time", "reminder_times", "follow_up_minutes", "created_at", "archived_at", "description", "habit_type", "target_value", "unit", "goal_period", "group_id", "sort_order"],
  habit_groups: ["id", "name", "created_at"],
  habit_schedule_days: ["habit_id", "weekday"],
  habit_schedule_versions: ["id", "habit_id", "schedule_type", "interval_days", "occurrences", "start_date", "end_date", "effective_from", "effective_until"],
  habit_schedule_version_weekdays: ["schedule_version_id", "weekday"],
  habit_schedule_version_month_days: ["schedule_version_id", "day_of_month"],
  habit_completions: ["id", "habit_id", "completion_date", "completed_at"],
  progress_entries: ["id", "habit_id", "local_date", "value", "state", "recorded_at", "note", "manual_value", "health_value"],
  habit_timer: ["singleton_id", "habit_id", "started_at", "accumulated_seconds"],
  habit_health_mappings: ["habit_id", "metric", "last_synced_at"],
  habit_health_values: ["habit_id", "local_date", "metric", "value", "updated_at"],
  sync_state: ["singleton_id", "enabled", "revision", "updated_at", "device_id", "deleted", "last_error"],
};
export type HabitBackup = { format: typeof BACKUP_FORMAT; version: typeof BACKUP_VERSION; exportedAt: string; data: Record<Table, Row[]> };

function validRow(value: unknown): value is Row { return !!value && typeof value === "object" && !Array.isArray(value) && Object.values(value as Record<string, unknown>).every((item) => item === null || typeof item === "string" || typeof item === "number"); }
function validate(input: unknown): HabitBackup {
  if (!input || typeof input !== "object") throw new Error("Backup must be a JSON object.");
  const backup = input as Partial<HabitBackup>;
  if (backup.format !== BACKUP_FORMAT) throw new Error("This is not a Habit Tracker backup.");
  if (backup.version !== BACKUP_VERSION) throw new Error("This backup version is not supported.");
  if (typeof backup.exportedAt !== "string" || Number.isNaN(Date.parse(backup.exportedAt))) throw new Error("Backup export date is invalid.");
  if (!backup.data || typeof backup.data !== "object") throw new Error("Backup data is missing.");
  for (const table of tables) {
    if (!Array.isArray(backup.data[table]) || !backup.data[table].every(validRow)) throw new Error(`Backup table ${table} is invalid.`);
    if (backup.data[table].some((row) => Object.keys(row).some((key) => !columns[table].includes(key)))) throw new Error(`Backup table ${table} contains unsupported columns.`);
  }
  const habitIds = new Set(backup.data.habits.map((row) => row.id));
  if (habitIds.size !== backup.data.habits.length || [...habitIds].some((id) => typeof id !== "string")) throw new Error("Backup has invalid habit identifiers.");
  for (const table of ["progress_entries", "habit_completions", "habit_schedule_versions", "habit_health_mappings", "habit_health_values"] as const) {
    if (backup.data[table].some((row) => typeof row.habit_id !== "string" || !habitIds.has(row.habit_id))) throw new Error(`Backup has an orphan record in ${table}.`);
  }
  const groupIds = new Set(backup.data.habit_groups.map((row) => row.id));
  if (backup.data.habits.some((row) => row.group_id !== null && (typeof row.group_id !== "string" || !groupIds.has(row.group_id)))) throw new Error("Backup has an orphan habit group reference.");
  if (backup.data.habit_schedule_days.some((row) => typeof row.habit_id !== "string" || !habitIds.has(row.habit_id))) throw new Error("Backup has an orphan legacy schedule day.");
  if (backup.data.habit_timer.some((row) => typeof row.habit_id !== "string" || !habitIds.has(row.habit_id))) throw new Error("Backup has an orphan timer.");
  const scheduleIds = new Set(backup.data.habit_schedule_versions.map((row) => row.id));
  for (const table of ["habit_schedule_version_weekdays", "habit_schedule_version_month_days"] as const) {
    if (backup.data[table].some((row) => typeof row.schedule_version_id !== "string" || !scheduleIds.has(row.schedule_version_id))) throw new Error(`Backup has an orphan record in ${table}.`);
  }
  return backup as HabitBackup;
}

async function insert(tx: Connection, table: Table, row: Row) {
  const keys = columns[table].filter((key) => Object.hasOwn(row, key));
  if (!keys.length) return;
  await tx.runAsync(`INSERT INTO ${table} (${keys.join(", ")}) VALUES (${keys.map(() => "?").join(", ")})`, ...keys.map((key) => row[key]));
}

export function backupRepository(db: Database) {
  return {
    async export(): Promise<HabitBackup> {
      const data = {} as Record<Table, Row[]>;
      for (const table of tables) data[table] = await db.getAllAsync<Row>(`SELECT * FROM ${table}`);
      return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), data };
    },
    preview(raw: string): { backup: HabitBackup; habits: number; progressEntries: number } {
      let parsed: unknown;
      try { parsed = JSON.parse(raw); } catch { throw new Error("Backup is not valid JSON."); }
      const backup = validate(parsed);
      return { backup, habits: backup.data.habits.length, progressEntries: backup.data.progress_entries.length };
    },
    async restore(backup: HabitBackup): Promise<void> {
      validate(backup);
      await db.withExclusiveTransactionAsync(async (tx) => {
        for (const table of [...tables].reverse()) await tx.runAsync(`DELETE FROM ${table}`);
        // Parents precede children; imported IDs and schedule history remain unchanged.
        for (const table of restoreOrder) for (const row of backup.data[table]) await insert(tx, table, row);
      });
    },
  };
}
