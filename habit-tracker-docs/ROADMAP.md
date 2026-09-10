# Habit Tracker — Implementation Roadmap

## Phase 1 — Application Shell

Goal: evaluate the product visually before implementing persistence.

Build:

- Expo project
- TypeScript
- Expo Router
- Today / Habits / Progress tabs
- Theme and design tokens
- Light / dark / system appearance
- Mock Today screen
- Mock Habits screen
- Mock Progress screen
- Local-state completion toggling
- Haptic feedback
- Basic micro-interactions

Do not build SQLite yet.

### Exit criteria

- App runs on iOS
- All three tabs work
- Today completion interaction feels good
- Light and dark appearance are usable
- Typecheck and lint pass

---

## Phase 2 — Local Database

Build:

- expo-sqlite setup
- Schema
- Migration runner
- Habit repository
- Completion repository
- Seed/dev data where useful

### Exit criteria

- Data survives application restarts
- Database setup is migration-based
- Screens do not contain raw SQL

---

## Phase 3 — Habit CRUD

Build:

- Create Habit
- Edit Habit
- Archive Habit
- Delete Habit
- Frequency picker
- Icon picker
- Color picker

### Exit criteria

A user can fully manage habits without mock data.

---

## Phase 4 — Today

Replace mock data with database-backed Today behavior.

Build:

- Scheduled-habit query
- Completion toggle
- Undo completion
- Daily progress
- Empty states
- Perfect Day state

### Exit criteria

Today is fully usable offline.

---

## Phase 5 — Streak Engine

Build and test:

- Daily streaks
- Specific-weekday streaks
- Current streak
- Longest streak
- Missed scheduled days
- Unscheduled-day behavior
- Today's incomplete occurrence behavior

### Exit criteria

All streak unit tests pass.

---

## Phase 6 — Progress

Build:

- Individual habit heatmap
- Six-month overall heatmap
- Weekly completion percentage
- Monthly completion percentage
- Current streak
- Best streak
- Habit breakdown

### Exit criteria

All metrics are derived from real local data.

---

## Phase 7 — Notifications

Build:

- Notification permission flow
- Reminder time selection
- Local scheduling
- Rescheduling on habit edits
- Cancellation on archive/delete
- Avoid unnecessary completed-habit reminders

### Exit criteria

Scheduled reminders behave correctly on a physical iPhone.

---

## Phase 8 — Polish

Review:

- Animations
- Haptics
- Accessibility labels
- Dynamic Type where practical
- Touch targets
- Empty states
- Error states
- Keyboard behavior
- Safe areas
- Dark mode
- Different iPhone sizes

Avoid adding new product features during this phase.

---

## Phase 9 — TestFlight

Build:

- Production app icon
- Splash screen
- Bundle identifier
- App metadata
- EAS production build
- App Store Connect upload
- TestFlight tester setup

### Exit criteria

Initial user can install and use the build through TestFlight.

---

## Phase 10 — 14-Day Validation

Do not immediately add requested features.

Collect actual usage and feedback.

Questions:

1. How many days did you use it?
2. Why did you miss days?
3. Which screen did you use most?
4. What annoyed you?
5. Why would you switch back to another tracker?
6. If only one feature could be added, what should it be?

Prioritize the next version from observed friction, not from feature brainstorming.
