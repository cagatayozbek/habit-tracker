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
export const migrations = [{ version: 1, sql: initialSchema }, { version: 2, sql: richHabitMigration }];
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
