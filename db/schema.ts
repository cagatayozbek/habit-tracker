export const initialSchema = `
CREATE TABLE habits (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL CHECK(length(trim(name)) > 0),
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  frequency_type TEXT NOT NULL CHECK(frequency_type IN ('daily', 'specific_days')),
  reminder_enabled INTEGER NOT NULL DEFAULT 0 CHECK(reminder_enabled IN (0, 1)),
  reminder_time TEXT,
  created_at TEXT NOT NULL,
  archived_at TEXT
);
CREATE TABLE habit_schedule_days (
  habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  weekday INTEGER NOT NULL CHECK(weekday BETWEEN 1 AND 7),
  PRIMARY KEY (habit_id, weekday)
);
CREATE TABLE habit_completions (
  id TEXT PRIMARY KEY NOT NULL,
  habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  completion_date TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  UNIQUE(habit_id, completion_date)
);
CREATE INDEX completions_date ON habit_completions(completion_date);
`;
