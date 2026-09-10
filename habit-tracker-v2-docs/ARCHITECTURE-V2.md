# Habit Tracker — Architecture V2

## Objective

Expand the existing SQLite-based local-first architecture without rebuilding V1. The main challenge is moving from binary completions to generalized progress and versioned schedules while preserving existing data.

## Principles

- SQLite remains the source of truth.
- Screens never execute raw SQL.
- Domain logic stays independent from React where possible.
- Historical schedules are versioned.
- Derived analytics come from stored facts.
- Calendar identity uses local dates.
- All schema changes use migrations.
- V1 data must survive.

## Habit model

```ts
type HabitType = 'check' | 'count' | 'quantity' | 'duration';
type GoalPeriod = 'daily' | 'weekly' | 'monthly';

interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string | null;
  type: HabitType;
  targetValue: number;
  unit: string | null;
  goalPeriod: GoalPeriod;
  groupId: string | null;
  createdAt: string;
  archivedAt: string | null;
}
```

Migrate existing habits to `check`, target `1`, goal period `daily`.

## Progress entries

```ts
type ProgressState = 'active' | 'completed' | 'failed' | 'skipped';

interface ProgressEntry {
  id: string;
  habitId: string;
  localDate: string;
  value: number;
  state: ProgressState;
  recordedAt: string;
  note: string | null;
}
```

Normalize duration to a documented base unit such as seconds. Define decimal rounding for quantities. Do not infer completion merely from row existence.

## Schedule versioning

Introduce immutable schedule versions with effective date ranges. Types:

- daily
- weekdays
- times_per_week
- times_per_month
- days_of_month
- interval

When a schedule changes, close the active version and create a new one. Never mutate historical expectations.

## Shared goal engine

Create one authoritative domain layer for:

- Goal-period boundaries
- Expected occurrences
- Accumulated progress
- Completion state
- Streak impact
- Completion percentage

Today, Progress, widgets, notifications, Watch and Siri must consume the same semantics.

## Migration safety

V1 → V2 migration must preserve habits, schedules, reminders, archives and completion history. Existing completion rows map to completed check progress with value `1`. Add migration fixtures/tests that begin from the prior schema. Never solve migration problems by deleting SQLite or requiring reinstall.

## Groups

Groups are optional. Deleting a group must ungroup habits, not delete them.

## Timer

Persist timestamps and accumulated duration. Do not trust JS interval ticks. Timer must survive navigation/backgrounding and restore state after reopening where practical. One active timer at a time is acceptable initially.

## Widget data

Use an app-group-compatible shared strategy. Generate a compact widget snapshot from canonical data. Widget interactions must safely update canonical storage and refresh all relevant surfaces. Verify the current Expo/native implementation path at implementation time.

## HealthKit

Keep HealthKit behind an adapter. Normalize imported Health values into ordinary progress semantics. Permission UI, Health API types and analytics logic must remain separated.

## Watch

Use a focused synchronized representation of today's habits. Share domain semantics, not phone UI components.

## Backup format

Use a versioned envelope:

```json
{
  "format": "habit-tracker-backup",
  "version": 2,
  "exportedAt": "ISO_TIMESTAMP",
  "data": {}
}
```

Import pipeline: parse → validate schema → validate relationships → preview/confirm → transaction → recalculate derived state. Never partially import malformed data.

## iCloud

Treat sync as replication of the local model, not replacement. Local writes remain immediate. Sync is asynchronous. Define record versions/conflict metadata and deletion semantics. Do not implement until the Phase 10–14 local model is stable.

## Notifications

Notification scheduling consumes the same schedule/goal engine. Multiple reminders need stable identifiers. Relevant mutations cancel stale notifications and recompute upcoming reminders.

## Search/sorting

SQLite is sufficient. Persist custom sort order. No external search dependency.

## Testing priorities

Test:

- V1 → V2 migration and rollback
- Daily/weekly/monthly goals
- Partial/decimal/duration progress
- All schedule types and schedule-version boundaries
- Streaks with failed/skipped/current/future periods
- Timer pause/background/restoration
- Backup round trips and invalid imports
- Integration adapters where practical

Physical-device acceptance testing is required for native platform features.

## Dependency discipline

Before adding a major package, explain why the current stack/platform APIs are insufficient, verify maintenance and Expo compatibility, consider native build implications, and document the decision.
