# AGENTS.md — Habit Tracker Engineering Instructions

## Product

This repository contains an iOS-first habit tracker built with React Native, Expo, and TypeScript.

Read `PRD.md`, `ARCHITECTURE.md`, and `ROADMAP.md` before making substantial product or architecture changes.

## Working Style

Work incrementally.

Do not implement later roadmap phases unless explicitly requested.

Before coding:

1. Inspect the repository.
2. Identify existing conventions and dependencies.
3. State a short implementation plan.
4. Preserve working configuration unless change is necessary.

After coding:

1. Run relevant type checks.
2. Run lint if configured.
3. Run tests relevant to the change.
4. Fix issues introduced by your work.
5. Summarize changed files and remaining limitations.

Never claim functionality was verified unless it was actually verified.

## Product Constraints

The app is:

- iOS-first
- Local-first
- Offline-capable
- Minimal
- Fast
- Calm and visually polished

Do not introduce without explicit instruction:

- Backend
- Authentication
- Supabase
- Firebase
- AI features
- Social features
- Payments
- Subscriptions
- Cloud sync
- Redux
- Zustand
- Heavy charting libraries
- Analytics SDKs
- Android-specific product work

## UI Direction

Aim for a premium native-iOS feeling.

Prefer:

- Generous whitespace
- Strong typography hierarchy
- Restrained color
- Subtle haptics
- Short micro-interactions
- Large touch targets
- Semantic design tokens

Avoid:

- Generic SaaS dashboard aesthetics
- Excessive gradients
- Excessive shadows
- Excessive cards
- Visual clutter
- Gamification overload

Do not copy HabitKit, Grit, or another application's proprietary UI, assets, branding, or layout.

## Architecture

Keep screen components reasonably small.

Prefer:

```text
Screen
→ hook/service
→ repository
→ SQLite
```

Keep domain logic such as streak calculations independent from React and persistence when possible.

Do not create abstractions before they are useful.

Do not use `any` unless there is a compelling documented reason.

## Dates

Date correctness is critical.

Habit schedules operate on the user's local calendar.

Completion identity is stored as local `YYYY-MM-DD`.

Do not casually convert historical completion dates through UTC.

Centralize date-related utilities.

## Database

Use `expo-sqlite`.

Use migrations for schema changes.

Do not make destructive schema assumptions once TestFlight builds have been distributed.

Screens must not contain raw SQL.

## Testing

Prioritize tests for:

- Streak calculation
- Schedule matching
- Completion percentages
- Date boundaries

When modifying these areas, add or update tests.

## Scope Discipline

If a task belongs to a later roadmap phase, do not silently implement it.

Build the smallest complete version of the requested phase.

The goal is a product a real person uses, not the largest possible codebase.
