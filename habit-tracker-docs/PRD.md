# Habit Tracker — Product Requirements Document

## 1. Product Summary

An iOS-first, local-first habit tracker focused on extremely fast daily check-ins and visually satisfying progress.

The initial user will receive the app through TestFlight. The product may take inspiration from the simplicity and visual-progress experience of products such as HabitKit and Grit, but it must not copy their branding, assets, layouts, or proprietary design.

### Core loop

**Remember → Open → Complete → See progress → Continue**

Completing a habit should require one tap.

## 2. Product Goal

The first milestone is not growth, monetization, or App Store downloads.

The first milestone is:

> A real user installs the TestFlight build and voluntarily uses it for at least 14 days.

Success means the app is simple enough to become part of the user's routine.

## 3. Product Principles

The app should feel:

- Calm
- Minimal
- Premium
- Native to iOS
- Fast
- Visually satisfying
- Personal rather than enterprise-like

Avoid:

- Dashboard-heavy UI
- Excessive cards, shadows, gradients, and gamification
- Feature clutter
- AI features without a clear user need
- Account creation before it is necessary

## 4. Platform

- iOS first
- Distributed initially through TestFlight
- React Native
- Expo
- TypeScript
- Expo Router
- EAS Build
- Local-first persistence
- No backend in v1
- No authentication in v1

## 5. Navigation

Bottom tabs:

1. Today
2. Habits
3. Progress

Settings is accessible from the top-right of the relevant screen and is not a fourth tab.

## 6. Onboarding

Onboarding should be extremely short.

### Welcome

Headline: `Build better days.`

Supporting copy: `Small actions. Visible progress.`

CTA: `Get Started`

### First Habit

Ask the user to create their first habit.

Do not ask for:

- Name
- Email
- Account
- Personality questionnaire
- Goals questionnaire

After the first habit is created, open Today.

## 7. Today

Today is the primary screen.

It must immediately answer:

1. What habits are scheduled today?
2. Which have I completed?
3. How much of today is finished?

### Header

- Current date
- Contextual greeting
- Settings access

### Daily progress

Show completed habits versus scheduled habits.

Example:

`3 of 5 completed`

Use a subtle visual progress indicator.

### Habit row

Each scheduled habit shows:

- Icon or emoji
- Name
- Habit color
- Completion state

A single tap toggles completion.

On completion:

- Update UI immediately
- Trigger subtle haptic feedback
- Use a short restrained animation
- Update daily progress
- Update streak calculations

Completion must be reversible.

### Perfect day

When every scheduled habit is complete, display a restrained success state:

`Perfect day ✨`

No excessive confetti.

## 8. Habits

Show all active habits.

Each item contains:

- Icon
- Name
- Schedule summary
- Current streak
- Habit color

Provide an obvious `Add Habit` action.

Selecting a habit opens Habit Detail.

## 9. Create / Edit Habit

Fields:

### Name

Required text field.

Example: `Read 20 pages`

### Icon

Emoji or icon picker.

### Color

Choose from a curated palette.

### Frequency

Support:

- Every day
- Specific weekdays

Example: Monday, Wednesday, Friday.

### Reminder

Optional.

If enabled, allow the user to choose a local reminder time.

### Actions

- Create
- Save changes
- Archive
- Delete

Deleting a habit also deletes its completion history and requires confirmation.

Archiving preserves history.

## 10. Habit Detail

Show:

- Habit icon
- Habit name
- Current streak
- Longest streak
- Total completions
- Last 30-day completion percentage
- Calendar / contribution-style heatmap
- Edit action

The heatmap is a core visual element of the product.

## 11. Progress

Show useful progress without turning the product into an analytics dashboard.

### Overall

- This week's completion percentage
- Completed / expected count
- Six-month contribution-style heatmap

### Key statistics

- Current streak
- Best streak
- This month's completion percentage

### Habit breakdown

Show completion percentage for each active habit.

Do not introduce a charting dependency unless it materially improves the product.

## 12. Streak Rules

Streaks operate on scheduled occurrences, not calendar days.

Example: a Monday/Wednesday/Friday habit completed on Monday and Wednesday has a streak of 2. Tuesday is ignored because the habit was not scheduled.

Rules:

- Completed scheduled occurrence → streak continues
- Unscheduled day → ignored
- Missed scheduled occurrence → streak breaks
- Future scheduled occurrences → ignored

Streak logic must have unit tests.

## 13. Notifications

Use local notifications.

A habit may have an optional reminder time.

If today's habit has already been completed before its reminder, the reminder should not unnecessarily notify the user.

Notification behavior should be updated when:

- Habit schedule changes
- Reminder changes
- Habit is archived
- Habit is deleted
- Today's completion changes

## 14. Appearance

Support:

- System
- Light
- Dark

Default: System.

## 15. Offline-First

The complete v1 experience must work without internet connectivity.

No network connection should be required to:

- Create habits
- Edit habits
- Complete habits
- View history
- Calculate streaks
- View progress
- Receive local reminders

## 16. Out of Scope for v1

Do not build:

- AI coach
- Chat
- Social features
- Friends
- Leaderboards
- Accounts
- Supabase
- Cloud sync
- Payments
- Subscriptions
- Apple Watch
- HealthKit
- Widgets
- Android
- XP systems
- Badges
- Advanced analytics

## 17. Potential v1.1 Features

Only consider these after real usage feedback:

- Home Screen widget
- Lock Screen widget
- Interactive widget
- Apple Watch
- iCloud sync
- Notes
- Numeric habits
- Duration-based habits
- Skip/freeze day
- Custom notification text

## 18. Validation

Run a 14-day TestFlight test.

Afterward ask:

1. How many days did you actually use it?
2. Why did you miss the days you did?
3. Which screen did you use most?
4. What annoyed you?
5. What would make you return to HabitKit or Grit?
6. If we could add only one feature, what would it be?

A useful early signal is voluntary usage on at least 10 of 14 days.
