# Habit Tracker — PRD V2

## Product direction

V2 extends the existing iOS-first, local-first habit tracker from a binary daily tracker into a feature-complete personal habit system. Preserve the calm, fast, native-feeling product identity. Competitors may inspire capability coverage, but do not copy branding, assets, copy, or proprietary layouts.

The existing V1 already includes Today/Habits/Progress, SQLite persistence and migrations, habit CRUD, daily/weekday schedules, binary completion, streaks, progress percentages, six-month heatmap, reminders, themes, archive/restore/delete, haptics and accessibility basics.

## Core habit model

Support four habit types:

- **Check** — binary habits such as vitamins or making the bed.
- **Count** — integer progress such as 50 push-ups or 8 glasses.
- **Quantity** — numeric progress with a unit such as 2.5 L, 5 km, 20 pages or 120 g.
- **Duration** — time-based progress such as 30 minutes reading or 15 minutes meditation.

Support goal periods:

- Daily
- Weekly
- Monthly

Examples: 5 km/day, exercise 3x/week, read 500 pages/month, meditate 5x/week.

A goal may be in progress, completed, failed or skipped. Skip and failure are distinct states and their streak semantics must be explicit and tested.

## Rich habit metadata

A habit may contain:

- Name
- Icon
- Color
- Description/notes
- Habit type
- Target value
- Unit
- Goal period
- Schedule
- Reminder configuration
- Group/category
- Start date
- Optional end date
- Archived state

## Flexible scheduling

Support:

- Every day
- Selected weekdays
- X times per week
- X times per month
- Specific days of month
- Every N days
- Optional start date
- Optional end date

Schedule changes must not rewrite historical expectations. Historical analytics must use the schedule version that applied at that time.

## Historical editing

Users can inspect a historical date/period and add, change or remove progress; mark it completed, failed or skipped; and add an optional note. Derived statistics update immediately.

## Daily experience

Today must support rich habits without clutter.

Examples:

```text
Vitamins       ✓
Water          5 / 8 glasses    +
Reading        12 / 20 pages    +
Meditation     08:32 / 15:00    Start
```

Check habits remain one-tap. Count habits support fast increment/decrement. Quantity habits support quick numeric entry. Duration habits support manual duration and an in-app timer.

## Habit groups

Optional groups such as Health, Fitness, Learning, Work, Morning and Evening. Users who never create groups should experience no additional friction.

## Timer

Duration habits support start, pause, resume and stop. Elapsed duration is added to progress. Timer state must survive backgrounding and reopening. Correctness must use timestamps, not an in-memory interval counter.

## Progress and analytics

Support:

- Daily/weekly/monthly completion
- Current and longest streak
- Total completions
- Total accumulated count/quantity/duration
- Habit history
- Overall and habit heatmaps
- Calendar history
- Trend view
- Goal-period progress
- Habit comparison
- Weekly recap
- Previous-period comparison

Keep analytics useful and restrained.

## Weekly recap

Deterministically derive:

- Overall completion rate
- Goals achieved
- Most consistent habit
- Most missed habit
- Strongest streak
- Change versus previous week

Do not generate fake motivational AI copy.

## Milestones and achievements

Support restrained milestones such as first completion, 7/30-period streaks, 100 completions and personal bests. No XP economy is required.

## Widgets

Support progressively:

- Daily progress Home Screen widget
- Today's habits widget
- Single-habit widget
- Consistency/heatmap widget
- Interactive completion where supported
- Interactive increment where appropriate
- Lock Screen surfaces where useful

Widget actions must update canonical data safely.

## Siri Shortcuts / App Intents

Expose:

- Complete habit
- Add progress
- Start habit timer
- Show today's habits

Use current Apple-supported mechanisms.

## Apple Health

Optional HealthKit integration for appropriate metrics such as steps, distance, workouts, mindful minutes, water and other reviewed supported metrics. Users explicitly choose mappings. Permission denial must never break ordinary tracking.

## Apple Watch

Focused companion experience:

- Today's habits
- Check completion
- Count increment
- Daily progress
- Timer controls where supported
- Complication/Smart Stack surface if justified

Do not reproduce the entire phone app.

## Backup and restore

Versioned JSON export/import containing habits, schedule history, progress, groups and relevant settings. Validate imports before applying them. Import must be transactional and reject malformed or unsupported backups safely.

## iCloud sync

Optional synchronization after the local V2 model is stable. Offline usage remains primary. Sync failures cannot destroy local data. Conflict resolution must be deterministic and multi-device convergence tested.

## Search, filter and sort

Support habit-name search; filtering by active/archive/group/type/today; sorting by custom order/name/streak/completion/recently created; and drag-to-reorder.

## Templates

Optional habit templates for common habits such as water, reading, exercise, meditation, walking and sleep routines. Templates are shortcuts, not mandatory onboarding.

## Advanced reminders

Support:

- Multiple reminders per habit
- Schedule-aware reminders
- Goal-period-aware reminders
- Optional follow-up if incomplete
- Quiet behavior after completion
- Timer notifications where useful

Avoid notification spam.

## Privacy

- Core data remains local.
- No account required for core use.
- No advertising SDK.
- No selling behavioral data.
- User data is exportable.
- Health data receives additional protection.
- Cloud features remain optional.

## Accessibility

Maintain and expand VoiceOver, Dynamic Type, Reduce Motion, adequate touch targets, color-independent states, dark mode, readable typography and accessible widget actions.

## Explicit non-goals

Unless separately approved:

- Social network
- Public profiles
- Friends/leaderboards
- AI coach/chatbot
- Ads
- Subscription/payment system
- Web app
- Android app
- Enterprise/team features

These are separate product decisions, not missing habit-tracker fundamentals.
