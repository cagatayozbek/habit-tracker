import type { Database } from "./connection.ts";
import { initialSchema } from "./schema.ts";
export const migrations = [{ version: 1, sql: initialSchema }];
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
