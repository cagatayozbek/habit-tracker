# Habit Tracker — Architecture

## 1. Technical Direction

The application is intentionally local-first.

### Stack

- React Native
- Expo
- TypeScript
- Expo Router
- expo-sqlite
- expo-notifications
- expo-haptics
- EAS Build

Avoid backend infrastructure until cross-device synchronization or accounts become a demonstrated requirement.

## 2. Suggested Project Structure

```text
app/
  _layout.tsx
  (tabs)/
    _layout.tsx
    index.tsx
    habits.tsx
    progress.tsx
  habit/
    new.tsx
    [id].tsx
    [id]/
      edit.tsx
  settings.tsx

components/
  HabitRow.tsx
  ProgressBar.tsx
  ScreenHeader.tsx
  Heatmap.tsx
  StatCard.tsx
  EmptyState.tsx

features/
  habits/
    habit.types.ts
    habit.repository.ts
    habit.service.ts
  completions/
    completion.types.ts
    completion.repository.ts
    streak.ts
  notifications/
    notification.service.ts

db/
  database.ts
  migrations.ts
  schema.ts

hooks/
  useColorScheme.ts
  useHabits.ts
  useTodayHabits.ts

theme/
  colors.ts
  spacing.ts
  typography.ts
  radius.ts
  index.ts

lib/
  dates.ts

types/
```

Keep this structure pragmatic. Do not create empty abstractions simply to match the tree.

## 3. Persistence

Use SQLite.

### habits

```sql
CREATE TABLE habits (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  frequency_type TEXT NOT NULL,
  reminder_enabled INTEGER NOT NULL DEFAULT 0,
  reminder_time TEXT,
  created_at TEXT NOT NULL,
  archived_at TEXT
);
```

### habit_schedule_days

```sql
CREATE TABLE habit_schedule_days (
  habit_id TEXT NOT NULL,
  weekday INTEGER NOT NULL,
  PRIMARY KEY (habit_id, weekday),
  FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
);
```

Use a documented weekday convention consistently, e.g. Monday = 1 through Sunday = 7.

### habit_completions

```sql
CREATE TABLE habit_completions (
  id TEXT PRIMARY KEY NOT NULL,
  habit_id TEXT NOT NULL,
  completion_date TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  UNIQUE (habit_id, completion_date),
  FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
);
```

`completion_date` represents the user's local calendar date as `YYYY-MM-DD`.

Do not derive it later from a UTC timestamp because timezone changes can otherwise move historical completions between days.

## 4. Domain Types

```ts
export type FrequencyType = 'daily' | 'specific_days';

export interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string;
  frequencyType: FrequencyType;
  scheduledDays: number[];
  reminderEnabled: boolean;
  reminderTime: string | null;
  createdAt: string;
  archivedAt: string | null;
}

export interface HabitCompletion {
  id: string;
  habitId: string;
  completionDate: string;
  completedAt: string;
}
```

## 5. Data Access

Screens should not execute raw SQL.

Prefer:

```text
Screen
  ↓
Hook / Service
  ↓
Repository
  ↓
SQLite
```

Repositories own database queries.

Domain logic such as streak calculation should remain independent from React and SQLite wherever possible so it can be unit tested.

## 6. Streak Engine

The streak engine receives:

- Habit schedule
- Completion dates
- Reference date

It returns:

```ts
interface StreakResult {
  current: number;
  longest: number;
}
```

Important invariants:

- Unscheduled dates do not break streaks.
- Missed scheduled occurrences break streaks.
- Future occurrences are ignored.
- Today's scheduled occurrence should not prematurely break a streak before the day has ended.
- Archived habits retain historical statistics.

Write unit tests for daily and selected-weekday schedules.

## 7. Today Query

Today's screen needs only habits scheduled for the user's current local weekday and not archived.

Each result should expose its completion state for the current local date.

Conceptually:

```ts
interface TodayHabit extends Habit {
  completedToday: boolean;
}
```

## 8. Heatmap

Do not store heatmap data.

Derive it from:

- schedules
- completions
- requested date range

Each displayed day can represent:

- no scheduled habits
- scheduled but none completed
- partially completed
- fully completed

For individual habit heatmaps, a day is simply completed / missed / unscheduled.

## 9. Notifications

Use local notifications.

Notification scheduling belongs in a notification service rather than screen components.

On create/update:

1. Cancel stale scheduled notifications for the habit.
2. Schedule new notifications according to frequency and reminder settings.

On archive/delete:

- Cancel associated notifications.

Completion behavior should avoid sending an unnecessary reminder for a habit already completed that day.

## 10. Theme

Centralize design tokens.

Components should consume semantic tokens such as:

```ts
background
surface
textPrimary
textSecondary
border
success
```

Habit colors are user-selected accent colors and should not replace semantic UI colors.

## 11. State Management

Do not add Redux/Zustand by default.

Start with:

- local component state
- hooks
- SQLite as source of truth

Add global state management only when a concrete coordination problem appears.

## 12. Date Handling

Habit trackers are highly sensitive to date bugs.

Rules:

- Scheduling is based on the user's local calendar.
- Completion identity is a local date (`YYYY-MM-DD`).
- Store exact completion timestamp separately.
- Centralize date utilities.
- Do not scatter `new Date()` parsing/formatting logic throughout UI components.

## 13. Testing Priorities

Highest priority unit tests:

1. Streak calculations
2. Schedule matching
3. Completion percentage calculations
4. Date boundary behavior

UI snapshot testing is lower priority for the initial MVP.

## 14. Migration Strategy

All schema changes must go through migrations.

Never assume the TestFlight user's local database can simply be deleted after builds start being distributed.

Use monotonically increasing migration versions.

## 15. Non-Goals

Do not architect for hypothetical millions of users.

The architecture should optimize for:

- Correctness
- Maintainability
- Fast iteration
- Local reliability
- Easy future migration to synchronization if validated
