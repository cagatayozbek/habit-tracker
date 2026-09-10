# AGENTS.md — V2 Engineering Instructions

Read `PRD-V2.md`, `ARCHITECTURE-V2.md` and `ROADMAP-V2.md` before substantial work.

## One phase only

Implement only the explicitly requested roadmap phase. Verify it, report results, and STOP. Every phase boundary is mandatory.

## Preserve V1

This is an existing working application. Do not rebuild from scratch. Preserve existing user data, migrations, tests, accessibility, themes and working behavior.

## Migration safety

Never fix schema changes by clearing SQLite, resetting app data, requiring reinstall or discarding history. Use versioned transactional migrations and tests beginning from the previous schema.

## Scope

Unless the requested phase requires it, do not introduce backend, auth, Supabase/Firebase, AI, social, payments/subscriptions, ads, global state libraries, analytics SDKs, Android-specific work or a web app.

## Architecture

TypeScript remains strict. Avoid `any`. Screens do not execute raw SQL. Keep domain logic separate from UI. Do not add dependencies without justification.

There must be one authoritative implementation for schedule evaluation, goal-period evaluation, streaks and completion percentages. Today, Progress, widgets, notifications, Watch and Siri consume shared semantics.

## Dates

Calendar identity uses local `YYYY-MM-DD`; timestamps are separate. Do not casually round-trip historical day identity through UTC. Centralize date logic and test boundaries.

## Native features

Before widgets/App Intents/HealthKit/Watch/iCloud work, inspect the current Expo SDK/project and verify the currently supported implementation path. Document native changes and perform physical-device verification when required.

## Verification

After each phase: typecheck, lint, relevant tests, full suite, Expo dependency check where relevant, iOS export/build check where relevant, and manual verification where possible. Report exactly what was and was not verified.

## Design

Maintain calm native-iOS presentation, generous whitespace, strong hierarchy, restrained color, clear progress feedback, subtle haptics and accessibility. Never copy competitor branding/assets/layouts.
