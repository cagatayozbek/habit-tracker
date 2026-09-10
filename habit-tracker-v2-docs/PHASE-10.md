# Phase 10 — Rich Habit Foundation

Read `AGENTS.md` (or replace it with `AGENTS-V2.md`), `PRD-V2.md`, `ARCHITECTURE-V2.md`, and `ROADMAP-V2.md`.

## Objective

Upgrade the existing binary completion model into generalized progress while preserving all existing data and behavior.

## Implement

Habit types: `check`, `count`, `quantity`, `duration`.

Goal periods: `daily`, `weekly`, `monthly`.

Add optional description, target value and optional unit.

Store partial progress and states: in-progress/active, completed, failed, skipped.

Allow historical progress to be added, changed, completed, failed, skipped or removed.

## Migration

Do not delete/reset SQLite. Preserve habits, icons, colors, schedules, reminders, archive state and history. Existing completion rows become completed check-habit progress with value `1`.

Add migration tests that construct the prior schema with representative data, run migration, and verify behavioral equivalence.

## Domain

Create shared functions for target completion, progress percentage, goal-period boundaries and progress-state derivation. Do not duplicate these calculations in screens.

## UI

Update create/edit flows for the new fields. Do not redesign the entire app. Today only needs compatibility sufficient to preserve existing check behavior and safely represent new rich habits; full rich Today UX is Phase 12.

## Tests

Cover check/count/quantity/duration targets, decimals, daily/weekly/monthly boundaries, failed/skipped states, historical edits, V1→V2 migration and existing check behavior.

## Acceptance

Phase 10 is complete only when existing data migrates without deletion; old check habits behave as before; all types/goal periods persist; partial/historical progress works; failed/skipped persist; shared domain evaluation exists; tests/typecheck/lint pass; iOS export/build verification remains healthy where available.

## STOP

Do not implement Phase 11, timer, widgets, Siri, HealthKit, Watch, backup, iCloud or power-user features. Report Phase 10 and wait.
