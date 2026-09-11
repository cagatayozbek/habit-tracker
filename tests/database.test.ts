import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Database, SqlValue } from "../db/connection.ts";
import { migrateDatabase, migrations } from "../db/migrations.ts";
import { habitRepository } from "../features/habits/habit.repository.ts";
import { completionRepository, progressRepository } from "../features/completions/completion.repository.ts";
import type { Habit } from "../features/habits/habit.types.ts";
import { assertLocalDateKey } from "../lib/dates.ts";
function connect(path: string) {
  const sqlite = new DatabaseSync(path);
  const db: Database = {
    async execAsync(sql) {
      sqlite.exec(sql);
    },
    async runAsync(sql, ...params: SqlValue[]) {
      return { changes: Number(sqlite.prepare(sql).run(...params).changes) };
    },
    async getAllAsync<T>(sql: string, ...params: SqlValue[]) {
      return sqlite.prepare(sql).all(...params) as T[];
    },
    async getFirstAsync<T>(sql: string, ...params: SqlValue[]) {
      return (sqlite.prepare(sql).get(...params) as T | undefined) ?? null;
    },
    async withExclusiveTransactionAsync(task) {
      sqlite.exec("BEGIN IMMEDIATE");
      try {
        await task(db);
        sqlite.exec("COMMIT");
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  };
  return { db, close: () => sqlite.close() };
}
const habit: Habit = {
  id: "read",
  name: "Read 'a book'",
  icon: "book-outline",
  color: "#123456",
  description: null,
  type: "check",
  targetValue: 1,
  unit: null,
  goalPeriod: "daily",
  groupId: null,
  sortOrder: 1,
  frequencyType: "specific_days",
  scheduledDays: [7, 1, 3],
  reminderEnabled: false,
  reminderTime: null,
  createdAt: "2026-09-10T12:00:00Z",
  archivedAt: null,
};
test("repository data survives reopen; migrations preserve history; archive and delete behave correctly", async () => {
  const dir = mkdtempSync(join(tmpdir(), "habits-"));
  let connection = connect(join(dir, "test.db"));
  try {
    await migrateDatabase(connection.db);
    const habits = habitRepository(connection.db);
    const completions = completionRepository(connection.db);
    await habits.save(habit);
    await completions.add({
      id: "c1",
      habitId: habit.id,
      completionDate: "2026-09-10",
      completedAt: "2026-09-11T01:00:00Z",
    });
    await completions.add({
      id: "c2",
      habitId: habit.id,
      completionDate: "2026-09-10",
      completedAt: "2026-09-11T02:00:00Z",
    });
    connection.close();
    connection = connect(join(dir, "test.db"));
    await migrateDatabase(connection.db);
    const reopened = habitRepository(connection.db);
    const history = completionRepository(connection.db);
    const reloaded = await reopened.get(habit.id);
    const { schedule: _schedule, groupName: _groupName, ...reloadedLegacy } = reloaded!;
    assert.deepEqual(reloadedLegacy, {
      ...habit,
      scheduledDays: [1, 3, 7],
    });
    assert.equal((await history.list(habit.id)).length, 1);
    assert.equal(
      (await history.list(habit.id))[0].completionDate,
      "2026-09-10",
    );
    await reopened.save({
      ...habit,
      frequencyType: "daily",
      scheduledDays: [],
      schedule: { type: "daily", weekdays: [], daysOfMonth: [], intervalDays: null, occurrences: null, startDate: "2026-09-11", endDate: null },
    });
    assert.deepEqual((await reopened.get(habit.id))?.scheduledDays, []);
    assert.equal((await history.list(habit.id)).length, 1);
    await reopened.archive(habit.id, "2026-09-12T00:00:00Z");
    assert.equal((await reopened.list()).length, 0);
    assert.equal((await reopened.list(true)).length, 1);
    assert.equal((await history.list(habit.id)).length, 1);
    await history.remove(habit.id, "2026-09-10");
    assert.deepEqual(await history.list(habit.id), []);
    await history.add({
      id: "c3",
      habitId: habit.id,
      completionDate: "2026-09-10",
      completedAt: habit.createdAt,
    });
    await reopened.delete(habit.id);
    assert.deepEqual(await history.list(habit.id), []);
    await assert.rejects(
      history.add({
        id: "orphan",
        habitId: "missing",
        completionDate: "2026-09-10",
        completedAt: habit.createdAt,
      }),
    );
  } finally {
    connection.close();
    rmSync(dir, { recursive: true });
  }
});
test("failed migration rolls back schema and version; newer databases are refused", async () => {
  const connection = connect(":memory:");
  try {
    await migrateDatabase(connection.db);
    migrations.push({
      version: 5,
      sql: "CREATE TABLE partial (id TEXT); INVALID SQL;",
    });
    try {
      await assert.rejects(migrateDatabase(connection.db));
    } finally {
      migrations.pop();
    }
    assert.equal(
      (
        await connection.db.getFirstAsync<{ user_version: number }>(
          "PRAGMA user_version",
        )
      )?.user_version,
      4,
    );
    assert.equal(
      await connection.db.getFirstAsync(
        "SELECT name FROM sqlite_master WHERE name='partial'",
      ),
      null,
    );
    await connection.db.execAsync("PRAGMA user_version = 99");
    await assert.rejects(migrateDatabase(connection.db), /newer version/);
  } finally {
    connection.close();
  }
});
test("V1 data migrates to rich check habits and preserves representative history", async () => {
  const connection = connect(":memory:");
  try {
    await connection.db.execAsync(migrations[0].sql);
    await connection.db.execAsync("PRAGMA user_version = 1");
    await connection.db.runAsync("INSERT INTO habits (id, name, icon, color, frequency_type, reminder_enabled, reminder_time, created_at, archived_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", "legacy", "Vitamins", "medical-outline", "#345678", "daily", 1, "09:00", "2026-01-01T00:00:00Z", "2026-02-01T00:00:00Z");
    await connection.db.runAsync("INSERT INTO habit_completions (id, habit_id, completion_date, completed_at) VALUES (?, ?, ?, ?)", "legacy-entry", "legacy", "2026-01-02", "2026-01-02T08:00:00Z");
    await migrateDatabase(connection.db);
    const migrated = await habitRepository(connection.db).get("legacy");
    assert.deepEqual(migrated && { type: migrated.type, targetValue: migrated.targetValue, unit: migrated.unit, goalPeriod: migrated.goalPeriod, reminderTime: migrated.reminderTime, archivedAt: migrated.archivedAt }, { type: "check", targetValue: 1, unit: null, goalPeriod: "daily", reminderTime: "09:00", archivedAt: "2026-02-01T00:00:00Z" });
    assert.deepEqual((await progressRepository(connection.db).list("legacy")).map((entry) => ({ ...entry })), [{ id: "legacy-entry", habitId: "legacy", localDate: "2026-01-02", value: 1, state: "completed", recordedAt: "2026-01-02T08:00:00Z", note: null }]);
  } finally { connection.close(); }
});
test("invalid schedules are rejected without changing the stored habit", async () => {
  const connection = connect(":memory:");
  try {
    await migrateDatabase(connection.db);
    const repo = habitRepository(connection.db);
    await repo.save(habit);
    await assert.rejects(repo.save({ ...habit, scheduledDays: [0, 8] }));
    await assert.rejects(repo.save({ ...habit, scheduledDays: [] }));
    assert.deepEqual((await repo.get(habit.id))?.scheduledDays, [1, 3, 7]);
  } finally {
    connection.close();
  }
});
test("optional groups persist without affecting ungrouped habits", async () => {
  const connection = connect(":memory:");
  try {
    await migrateDatabase(connection.db);
    const repo = habitRepository(connection.db);
    await repo.save(habit, "Health");
    await repo.save({ ...habit, id: "plain", sortOrder: 2 });
    const saved = await repo.get(habit.id);
    assert.equal(saved?.groupName, "Health");
    assert.ok(saved?.groupId);
    assert.equal((await repo.get("plain"))?.groupId, null);
  } finally { connection.close(); }
});
test("schedule edits close the old version instead of rewriting historical dates", async () => {
  const connection = connect(":memory:");
  try {
    await migrateDatabase(connection.db);
    const repo = habitRepository(connection.db);
    const original = { ...habit, schedule: { type: "weekdays" as const, weekdays: [1], daysOfMonth: [], intervalDays: null, occurrences: null, startDate: "2026-09-01", endDate: null } };
    await repo.save(original);
    await repo.save({ ...original, schedule: { type: "days_of_month" as const, weekdays: [], daysOfMonth: [11], intervalDays: null, occurrences: null, startDate: "2026-09-11", endDate: null } });
    const versions = (await connection.db.getAllAsync<{ schedule_type: string; effective_from: string; effective_until: string | null }>("SELECT schedule_type, effective_from, effective_until FROM habit_schedule_versions WHERE habit_id = ? ORDER BY effective_from", original.id)).map(({ schedule_type, effective_from, effective_until }) => ({ schedule_type, effective_from, effective_until }));
    assert.deepEqual(versions, [
      { schedule_type: "weekdays", effective_from: "2026-09-01", effective_until: "2026-09-10" },
      { schedule_type: "days_of_month", effective_from: "2026-09-11", effective_until: null },
    ]);
    assert.deepEqual((await repo.listScheduledForDate("2026-09-07", 1)).map((item) => item.id), [original.id]);
    assert.deepEqual((await repo.listScheduledForDate("2026-09-11", 5)).map((item) => item.id), [original.id]);
  } finally { connection.close(); }
});
test("stored completion dates validate calendar dates without timezone conversion", () => {
  for (const valid of ["2028-02-29", "2026-12-31"])
    assert.doesNotThrow(() => assertLocalDateKey(valid));
  for (const invalid of [
    "2026-02-29",
    "2026-04-31",
    "2026-00-01",
    "2026-13-01",
    "2026-1-01",
    "2026-09-10T00:00:00Z",
  ])
    assert.throws(() => assertLocalDateKey(invalid));
});

test("today query returns only active scheduled habits with date-specific completion state", async () => {
  const connection = connect(":memory:");
  try {
    await migrateDatabase(connection.db);
    const habits = habitRepository(connection.db);
    const completions = completionRepository(connection.db);
    const scheduleStart = "2026-09-01";
    const mondayHabit = { ...habit, id: "monday", scheduledDays: [1], schedule: { type: "weekdays" as const, weekdays: [1], daysOfMonth: [], intervalDays: null, occurrences: null, startDate: scheduleStart, endDate: null } };
    const tuesdayHabit = { ...habit, id: "tuesday", scheduledDays: [2], schedule: { type: "weekdays" as const, weekdays: [2], daysOfMonth: [], intervalDays: null, occurrences: null, startDate: scheduleStart, endDate: null } };
    const dailyHabit = {
      ...habit,
      id: "daily",
      frequencyType: "daily" as const,
      scheduledDays: [],
      schedule: { type: "daily" as const, weekdays: [], daysOfMonth: [], intervalDays: null, occurrences: null, startDate: scheduleStart, endDate: null },
    };
    await habits.save(mondayHabit);
    await habits.save(tuesdayHabit);
    await habits.save(dailyHabit);
    await completions.add({
      id: "today-completion",
      habitId: dailyHabit.id,
      completionDate: "2026-09-07",
      completedAt: "2026-09-07T08:00:00Z",
    });
    await habits.archive(mondayHabit.id, "2026-09-07T09:00:00Z");

    assert.deepEqual(
      (await habits.listScheduledForDate("2026-09-07", 1)).map((item) => ({
        id: item.id,
        completedToday: item.completedToday,
      })),
      [{ id: "daily", completedToday: true }],
    );
    assert.deepEqual(
      (await habits.listScheduledForDate("2026-09-08", 2)).map((item) => ({
        id: item.id,
        completedToday: item.completedToday,
      })),
      [
        { id: "daily", completedToday: false },
        { id: "tuesday", completedToday: false },
      ],
    );
  } finally {
    connection.close();
  }
});
