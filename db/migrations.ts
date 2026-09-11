import type { Database } from "./connection.ts";
import { initialSchema } from "./schema.ts";
const richHabitMigration = `
ALTER TABLE habits ADD COLUMN description TEXT;
ALTER TABLE habits ADD COLUMN habit_type TEXT NOT NULL DEFAULT 'check' CHECK(habit_type IN ('check', 'count', 'quantity', 'duration'));
ALTER TABLE habits ADD COLUMN target_value REAL NOT NULL DEFAULT 1 CHECK(target_value > 0);
ALTER TABLE habits ADD COLUMN unit TEXT;
ALTER TABLE habits ADD COLUMN goal_period TEXT NOT NULL DEFAULT 'daily' CHECK(goal_period IN ('daily', 'weekly', 'monthly'));
CREATE TABLE progress_entries (
  id TEXT PRIMARY KEY NOT NULL,
  habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  local_date TEXT NOT NULL,
  value REAL NOT NULL CHECK(value >= 0),
  state TEXT NOT NULL CHECK(state IN ('active', 'completed', 'failed', 'skipped')),
  recorded_at TEXT NOT NULL,
  note TEXT,
  UNIQUE(habit_id, local_date)
);
INSERT INTO progress_entries (id, habit_id, local_date, value, state, recorded_at, note)
SELECT id, habit_id, completion_date, 1, 'completed', completed_at, NULL FROM habit_completions;
CREATE INDEX progress_entries_habit_date ON progress_entries(habit_id, local_date);
`;
const scheduleHistoryMigration = `
CREATE TABLE habit_schedule_versions (
  id TEXT PRIMARY KEY NOT NULL,
  habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  schedule_type TEXT NOT NULL CHECK(schedule_type IN ('daily', 'weekdays', 'times_per_week', 'times_per_month', 'days_of_month', 'interval')),
  interval_days INTEGER,
  occurrences INTEGER,
  start_date TEXT NOT NULL,
  end_date TEXT,
  effective_from TEXT NOT NULL,
  effective_until TEXT,
  CHECK((schedule_type = 'interval' AND interval_days > 0) OR (schedule_type <> 'interval' AND interval_days IS NULL)),
  CHECK((schedule_type IN ('times_per_week', 'times_per_month') AND occurrences > 0) OR (schedule_type NOT IN ('times_per_week', 'times_per_month') AND occurrences IS NULL)),
  CHECK(effective_until IS NULL OR effective_until >= effective_from),
  CHECK(end_date IS NULL OR end_date >= start_date)
);
CREATE TABLE habit_schedule_version_weekdays (
  schedule_version_id TEXT NOT NULL REFERENCES habit_schedule_versions(id) ON DELETE CASCADE,
  weekday INTEGER NOT NULL CHECK(weekday BETWEEN 1 AND 7),
  PRIMARY KEY(schedule_version_id, weekday)
);
CREATE TABLE habit_schedule_version_month_days (
  schedule_version_id TEXT NOT NULL REFERENCES habit_schedule_versions(id) ON DELETE CASCADE,
  day_of_month INTEGER NOT NULL CHECK(day_of_month BETWEEN 1 AND 31),
  PRIMARY KEY(schedule_version_id, day_of_month)
);
INSERT INTO habit_schedule_versions (id, habit_id, schedule_type, interval_days, occurrences, start_date, end_date, effective_from, effective_until)
SELECT 'legacy-' || id, id, CASE frequency_type WHEN 'daily' THEN 'daily' ELSE 'weekdays' END, NULL, NULL, substr(created_at, 1, 10), NULL, substr(created_at, 1, 10), NULL FROM habits;
INSERT INTO habit_schedule_version_weekdays (schedule_version_id, weekday)
SELECT 'legacy-' || habit_id, weekday FROM habit_schedule_days;
CREATE INDEX schedule_versions_habit_effective ON habit_schedule_versions(habit_id, effective_from, effective_until);
`;
const dailyExperienceMigration = `
CREATE TABLE habit_groups (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE,
  created_at TEXT NOT NULL
);
ALTER TABLE habits ADD COLUMN group_id TEXT REFERENCES habit_groups(id) ON DELETE SET NULL;
ALTER TABLE habits ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
UPDATE habits SET sort_order = rowid WHERE sort_order = 0;
CREATE INDEX habits_group_order ON habits(group_id, sort_order, created_at);
`;
export const migrations = [{ version: 1, sql: initialSchema }, { version: 2, sql: richHabitMigration }, { version: 3, sql: scheduleHistoryMigration }, { version: 4, sql: dailyExperienceMigration }];
export async function migrateDatabase(db: Database) {
  await db.execAsync(
    "PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;",
  );
  await db.withExclusiveTransactionAsync(async (tx) => {
    // Expo opens a separate connection for exclusive transactions.
    const row = await tx.getFirstAsync<{ user_version: number }>(
      "PRAGMA user_version",
    );
    const version = row?.user_version ?? 0;
    if (version > migrations[migrations.length - 1].version) {
      throw new Error("This database needs a newer version of the app.");
    }
    for (const migration of migrations) {
      if (migration.version <= version) continue;
      await tx.execAsync(migration.sql);
      await tx.execAsync(`PRAGMA user_version = ${migration.version}`);
    }
  });
}
