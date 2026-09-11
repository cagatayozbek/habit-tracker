import assert from "node:assert/strict";
import test from "node:test";
import { localDateKey, localWeekday, greeting } from "../lib/dates.ts";
import { calculateProgress, completionPercentage } from "../lib/progress.ts";
import type { Habit } from "../features/habits/habit.types.ts";
import { calculateStreaks } from "../features/completions/streak.ts";
import { calculateGoalStreaks, evaluateGoal, evaluateScheduledGoal, goalPeriodBounds, progressStateForValue, targetCompletionPercentage } from "../lib/goals.ts";
import { expectedOccurrences, scheduleMatchesDate, scheduleMatchesVersionedDate } from "../lib/schedules.ts";
test("completion percentage handles empty, partial, complete and bounded counts", () => {
  assert.equal(completionPercentage(0, 0), 0);
  assert.equal(completionPercentage(1, 4), 25);
  assert.equal(completionPercentage(4, 4), 100);
  assert.equal(completionPercentage(1, 3), 33);
  assert.equal(completionPercentage(5, 4), 100);
  assert.equal(completionPercentage(-1, 4), 0);
});
test("calendar keys preserve the local date around midnight and year boundaries", () => {
  assert.equal(localDateKey(new Date(2026, 0, 1, 0, 1)), "2026-01-01");
  assert.equal(localDateKey(new Date(2026, 11, 31, 23, 59)), "2026-12-31");
  assert.equal(localDateKey(new Date(2028, 1, 29, 12)), "2028-02-29");
});
test("greeting changes at noon and evening", () => {
  assert.equal(greeting(new Date(2026, 8, 10, 11)), "Good morning.");
  assert.equal(greeting(new Date(2026, 8, 10, 12)), "Good afternoon.");
  assert.equal(greeting(new Date(2026, 8, 10, 18)), "Good evening.");
});
test("local weekdays use ISO Monday-through-Sunday values", () => {
  assert.equal(localWeekday(new Date(2026, 8, 7, 12)), 1);
  assert.equal(localWeekday(new Date(2026, 8, 13, 12)), 7);
});

test("daily streaks ignore an incomplete reference day but break on prior misses", () => {
  const daily = { frequencyType: "daily" as const, scheduledDays: [] };
  assert.deepEqual(
    calculateStreaks(daily, ["2026-09-07", "2026-09-08", "2026-09-09"], "2026-09-10"),
    { current: 3, longest: 3 },
  );
  assert.deepEqual(
    calculateStreaks(daily, ["2026-09-07", "2026-09-09"], "2026-09-10"),
    { current: 1, longest: 1 },
  );
});

test("specific-weekday streaks skip unscheduled days and count missed occurrences", () => {
  const mondayWednesdayFriday = {
    frequencyType: "specific_days" as const,
    scheduledDays: [1, 3, 5],
  };
  assert.deepEqual(
    calculateStreaks(
      mondayWednesdayFriday,
      ["2026-09-07", "2026-09-09"],
      "2026-09-10",
    ),
    { current: 2, longest: 2 },
  );
  assert.deepEqual(
    calculateStreaks(
      mondayWednesdayFriday,
      ["2026-09-07", "2026-09-11"],
      "2026-09-12",
    ),
    { current: 1, longest: 1 },
  );
});

test("streaks ignore future and unscheduled completions", () => {
  const weekdays = { frequencyType: "specific_days" as const, scheduledDays: [1] };
  assert.deepEqual(
    calculateStreaks(weekdays, ["2026-09-07", "2026-09-08", "2026-09-14"], "2026-09-10"),
    { current: 1, longest: 1 },
  );
});

test("progress derives expected occurrences, percentages, and heatmap levels from schedules", () => {
  const daily: Habit = {
    id: "daily", name: "Read", icon: "book-outline", color: "#123456",
    description: null, type: "check", targetValue: 1, unit: null, goalPeriod: "daily",
    groupId: null, sortOrder: 1,
    frequencyType: "daily", scheduledDays: [], reminderEnabled: false,
    reminderTime: null, createdAt: "2026-09-01T12:00:00Z", archivedAt: null,
  };
  const monday: Habit = { ...daily, id: "monday", frequencyType: "specific_days", scheduledDays: [1] };
  const summary = calculateProgress(
    [daily, monday],
    new Map([["daily", ["2026-09-07", "2026-09-08", "2026-09-09"]], ["monday", ["2026-09-07"]]]),
    "2026-09-10",
  );
  assert.deepEqual(summary.week, { completed: 4, expected: 5, percentage: 80 });
  assert.equal(summary.month.percentage, 36);
  assert.equal(summary.currentStreak, 3);
  assert.equal(summary.heatmap.find((day) => day.date === "2026-09-10")?.level, 1);
  assert.equal(summary.heatmap.find((day) => day.date === "2026-09-07")?.level, 4);
});

test("shared goal engine handles targets, decimals, terminal states and local period boundaries", () => {
  assert.equal(targetCompletionPercentage(2.5, 5), 50);
  assert.equal(progressStateForValue(5, 5), "completed");
  assert.equal(progressStateForValue(1, 5, "skipped"), "skipped");
  assert.deepEqual(goalPeriodBounds("2026-01-01", "weekly"), { start: "2025-12-29", end: "2026-01-04" });
  assert.deepEqual(goalPeriodBounds("2028-02-29", "monthly"), { start: "2028-02-01", end: "2028-02-29" });
  const goal = { targetValue: 3, goalPeriod: "weekly" as const };
  const entries = [
    { id: "one", habitId: "h", localDate: "2026-01-01", value: 1.5, state: "active" as const, recordedAt: "x", note: null },
    { id: "two", habitId: "h", localDate: "2026-01-02", value: 1.5, state: "completed" as const, recordedAt: "x", note: null },
  ];
  assert.deepEqual(evaluateGoal(goal, entries, "2026-01-03"), { start: "2025-12-29", end: "2026-01-04", value: 3, state: "completed", percentage: 100 });
});

test("all flexible schedule rules resolve with local month lengths and inclusive boundaries", () => {
  const base = { weekdays: [], daysOfMonth: [], intervalDays: null, occurrences: null, startDate: "2028-02-01", endDate: "2028-02-29" };
  assert.equal(scheduleMatchesDate({ ...base, type: "daily" }, "2028-02-29"), true);
  assert.equal(scheduleMatchesDate({ ...base, type: "weekdays", weekdays: [4] }, "2028-02-03"), true);
  assert.equal(scheduleMatchesDate({ ...base, type: "days_of_month", daysOfMonth: [29, 31] }, "2028-02-29"), true);
  assert.equal(expectedOccurrences({ ...base, type: "days_of_month", daysOfMonth: [29, 31] }, "2028-02-01", "2028-02-29"), 1);
  assert.equal(scheduleMatchesDate({ ...base, type: "interval", intervalDays: 3 }, "2028-02-28"), true);
  assert.equal(expectedOccurrences({ ...base, type: "times_per_week", occurrences: 2 }, "2028-02-01", "2028-02-29"), 10);
  assert.equal(expectedOccurrences({ ...base, type: "times_per_month", occurrences: 4 }, "2028-02-01", "2028-02-29"), 4);
});

test("schedule versions preserve historical expectations and goal-period streaks ignore unfinished periods", () => {
  const versions = [
    { id: "one", habitId: "h", type: "weekdays" as const, weekdays: [1], daysOfMonth: [], intervalDays: null, occurrences: null, startDate: "2026-01-01", endDate: null, effectiveFrom: "2026-01-01", effectiveUntil: "2026-01-31" },
    { id: "two", habitId: "h", type: "days_of_month" as const, weekdays: [], daysOfMonth: [1], intervalDays: null, occurrences: null, startDate: "2026-02-01", endDate: null, effectiveFrom: "2026-02-01", effectiveUntil: null },
  ];
  assert.equal(scheduleMatchesVersionedDate(versions, "2026-01-05"), true);
  assert.equal(scheduleMatchesVersionedDate(versions, "2026-01-06"), false);
  assert.equal(scheduleMatchesVersionedDate(versions, "2026-02-01"), true);
  const entries = [
    { id: "jan", habitId: "h", localDate: "2026-01-05", value: 1, state: "completed" as const, recordedAt: "x", note: null },
    { id: "feb", habitId: "h", localDate: "2026-02-01", value: 1, state: "completed" as const, recordedAt: "x", note: null },
  ];
  const habitGoal = { targetValue: 1, goalPeriod: "monthly" as const };
  assert.deepEqual(evaluateScheduledGoal(habitGoal, versions, entries, "2026-01-20"), { start: "2026-01-01", end: "2026-01-31", value: 1, state: "completed", percentage: 100, expectedOccurrences: 4 });
  assert.deepEqual(calculateGoalStreaks(habitGoal, versions, entries, "2026-03-01"), { current: 2, longest: 2 });
});
