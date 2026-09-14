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
import { timerService } from "../features/timer/timer.service.ts";
import { healthRepository } from "../features/health/health.repository.ts";
import { backupRepository } from "../features/backup/backup.repository.ts";
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
test("backup round trip restores canonical data and rejects malformed or future backups", async () => {
  const dir = mkdtempSync(join(tmpdir(), "habit-backup-"));
  const connection = connect(join(dir, "test.db"));
  try {
    await migrateDatabase(connection.db);
    const habits = habitRepository(connection.db);
    await habits.save({ ...habit, id: "backup-habit" });
    const backups = backupRepository(connection.db);
    const exported = await backups.export();
    await habits.delete("backup-habit");
    await backups.restore(backups.preview(JSON.stringify(exported)).backup);
    assert.equal((await habits.get("backup-habit"))?.name, habit.name);
    assert.throws(() => backups.preview("{bad"), /valid JSON/);
    assert.throws(() => backups.preview(JSON.stringify({ ...exported, version: 99 })), /not supported/);
    const unsupported = structuredClone(exported);
    unsupported.data.habits[0].sql = "DROP TABLE habits";
    assert.throws(() => backups.preview(JSON.stringify(unsupported)), /unsupported columns/);
    const orphan = structuredClone(exported);
    orphan.data.habit_timer.push({ singleton_id: 1, habit_id: "missing", started_at: null, accumulated_seconds: 1 });
    assert.throws(() => backups.preview(JSON.stringify(orphan)), /orphan timer/);
  } finally { connection.close(); rmSync(dir, { recursive: true, force: true }); }
});
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
  reminderTimes: [],
  followUpMinutes: null,
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
    const latestVersion = migrations.at(-1)!.version;
    migrations.push({
      version: latestVersion + 1,
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
      latestVersion,
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
test("duration timer persists timestamp state and rejects invalid or archived habits", async () => {
  const connection = connect(":memory:");
  try {
    await migrateDatabase(connection.db);
    const habits = habitRepository(connection.db);
    const timers = timerService(connection.db);
    const duration = { ...habit, id: "meditate", type: "duration" as const, targetValue: 900, unit: "seconds" };
    await habits.save(duration);
    assert.deepEqual(await timers.start(duration.id, "2026-09-14T10:00:00.000Z"), { habitId: duration.id, startedAt: "2026-09-14T10:00:00.000Z", accumulatedSeconds: 0 });
    assert.deepEqual(await timers.pause("2026-09-14T10:01:30.000Z"), { habitId: duration.id, startedAt: null, accumulatedSeconds: 90 });
    assert.deepEqual(await timers.start(duration.id, "2026-09-14T10:02:00.000Z"), { habitId: duration.id, startedAt: "2026-09-14T10:02:00.000Z", accumulatedSeconds: 90 });
    await habits.archive(duration.id, "2026-09-14T10:03:00.000Z");
    await timers.clear();
    await assert.rejects(timers.start(duration.id, "2026-09-14T10:04:00.000Z"), /unavailable/);
    await assert.rejects(timers.start(habit.id, "2026-09-14T10:04:00.000Z"), /unavailable/);
  } finally { connection.close(); }
});
test("Health imports replace daily contribution without inflating duplicates and preserve manual progress", async () => {
  const connection = connect(":memory:");
  try {
    await migrateDatabase(connection.db);
    const habits = habitRepository(connection.db);
    const progress = progressRepository(connection.db);
    const health = healthRepository(connection.db);
    const water = { ...habit, id: "water", type: "quantity" as const, targetValue: 2, unit: "L" };
    await habits.save(water);
    await progress.save({ id: "manual", habitId: water.id, localDate: "2026-09-14", value: 0.5, state: "active", recordedAt: "2026-09-14T08:00:00Z", note: null }, water.targetValue);
    await health.setMapping(water.id, "water");
    await health.applyDailyValues(water.id, "water", water.targetValue, new Map([["2026-09-14", 1]]), "2026-09-14T09:00:00Z");
    assert.equal((await progress.list(water.id))[0].value, 1.5);
    await health.applyDailyValues(water.id, "water", water.targetValue, new Map([["2026-09-14", 1.2]]), "2026-09-14T10:00:00Z");
    assert.equal((await progress.list(water.id))[0].value, 1.7);
    await health.setMapping(water.id, null);
    assert.equal((await progress.list(water.id))[0].value, 0.5);
  } finally { connection.close(); }
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
test("multiple reminder preferences migrate and persist, and bulk archive is atomic", async () => {
  const connection = connect(":memory:");
  try {
    await migrateDatabase(connection.db);
    const repo = habitRepository(connection.db);
    await repo.save({ ...habit, reminderEnabled: true, reminderTime: "09:00", reminderTimes: ["09:00", "18:30"], followUpMinutes: 45 });
    await repo.save({ ...habit, id: "second" });
    const saved = await repo.get(habit.id);
    assert.deepEqual(saved?.reminderTimes, ["09:00", "18:30"]);
    assert.equal(saved?.followUpMinutes, 45);
    await repo.archiveMany([habit.id, "second"], "2026-09-14T12:00:00Z");
    assert.equal((await repo.list()).length, 0);
    assert.equal((await repo.list(true)).filter((item) => item.archivedAt).length, 2);
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
