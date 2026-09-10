# Habit Tracker — Roadmap V2

## Execution rule

Implement exactly one phase at a time. After each phase run typecheck, lint, relevant tests, the full existing test suite, and manual verification where possible. Document what was and was not verified, then **STOP**. Never automatically continue to the next phase.

# Phase 10 — Rich Habit Foundation

Upgrade binary completion to generalized progress.

Scope: Check/Count/Quantity/Duration; Daily/Weekly/Monthly goals; target value; unit; description; partial progress; completed/failed/skipped states; historical editing; transactional V1→V2 migration.

Acceptance: existing data survives; old check habits behave identically; all four types persist; decimal and duration values work; historical edits recalculate analytics; migration tests pass.

**STOP:** no advanced scheduling, timer, widgets, Health, Watch or iCloud.

# Phase 11 — Flexible Scheduling & Goal Semantics

Scope: every day, weekdays, X/week, X/month, month days, every N days, start/end dates, immutable schedule history, goal-period and streak semantics.

Acceptance: schedule changes do not rewrite history; all schedules resolve correctly; month-length/future-period/version-boundary tests pass.

**STOP:** no timer/platform integrations.

# Phase 12 — Daily Experience 2.0

Scope: rich Today rows; increment/decrement; quick quantity entry; partial progress; manual duration; fail/skip/undo; groups/categories; optional grouped Today; custom ordering; interaction/haptic/accessibility polish.

Acceptance: check remains one-tap; rich progress is fast; skip/fail are distinct; groups add no friction when unused; VoiceOver and Reduce Motion remain correct.

**STOP:** no running timer yet.

# Phase 13 — Timer

Scope: start/pause/resume/stop; manual duration; background-safe elapsed time; restoration; Today timer state; useful timer notifications.

Acceptance: timestamp-based correctness; backgrounding/reopening does not lose time; paused time excluded; physical-iPhone verification documented.

**STOP:** no widgets/Health.

# Phase 14 — Progress, Review & Achievements

Scope: rich heatmaps; calendar history; weekly/monthly trends; goal-period progress; habit analytics; totals; weekly recap; previous-period comparison; restrained milestones; simple alternative visualizations.

Acceptance: every habit type works; schedule history is respected; recap is deterministic; totals and partial states are correct.

**STOP:** no AI/social.

# Phase 15 — Widgets

Scope: daily progress, Today habits, single habit, optional heatmap widget, interactive completion/increment, useful Lock Screen surfaces, shared data mechanism.

Acceptance: widget/app remain consistent; archive/delete handled; light/dark and common sizes tested; physical-device verification documented.

**STOP:** no Health/Watch automatically.

# Phase 16 — Siri Shortcuts & App Intents

Scope: complete habit, add progress, start timer, show Today.

Acceptance: actions modify canonical data; archived/invalid habits fail gracefully; domain logic is not duplicated; physical-device verification.

# Phase 17 — Apple Health

Scope: permission flow; per-habit mapping; steps, distance, workouts, mindful minutes, water and only reviewed additional metrics; manual tracking remains available.

Acceptance: explicit opt-in; denied permissions safe; normalized adapter; no duplicate inflation; physical-device testing.

# Phase 18 — Apple Watch

Scope: Today, check completion, count increment, progress, timer controls, complication/Smart Stack if justified.

Acceptance: phone/watch consistency; intermittent connectivity handled; focused watch UI; physical Watch verification.

# Phase 19 — Backup, Export & Import

Scope: versioned JSON export, share flow, validation, import preview, transactional restore, schema documentation.

Acceptance: full round trip reconstructs data; malformed/future versions fail safely; no partial corruption.

**STOP:** no cloud sync.

# Phase 20 — iCloud Sync

Scope: optional sync; record versions; conflicts; tombstones/deletion; multi-device convergence; sync status/errors.

Acceptance: offline-first remains; local actions immediate; sync failure cannot destroy history; deterministic conflict behavior; two-device testing.

# Phase 21 — Power User Organization

Scope: search, filters, sorting, drag reorder, group polish, archive management, templates, duplicate habit, optional bulk archive.

Acceptance: instant local search; ordering persists; templates optional; destructive bulk actions confirmed.

**STOP:** no community marketplace.

# Phase 22 — Advanced Reminders

Scope: multiple reminders; schedule/goal-aware reminders; optional incomplete follow-up; completion-aware cancellation; timer reminders; preference controls.

Acceptance: no unnecessary post-completion reminders; stale notifications cancelled; stable IDs; denied permissions safe; notification volume understandable.

**STOP:** no push backend.

# Phase 23 — Final Polish & TestFlight Validation

Scope: cross-feature regression; accessibility; Dynamic Type; Reduce Motion; themes; errors/empty states; migrations; backup; widgets; integration checks; performance; production TestFlight build; real-user validation.

Run 14-day validation and 30-day follow-up if usage continues. Measure usage frequency, abandoned habits, habit-type usage, widget/reminder usefulness, historical editing and integration usefulness.

**STOP:** social, AI, monetization, Android and web require a new product decision and PRD.
