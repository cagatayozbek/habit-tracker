# Habit Tracker

Phase 9 preparation: an iOS-first Expo / TypeScript habit tracker with local SQLite persistence.
Product documents and engineering instructions live in `habit-tracker-docs/`.

## TestFlight release preparation

- Version `1.0.0`, iOS build number `1`, a production EAS build profile, and App
  Store submission profile are configured.
- The app uses the opaque 1024px production icon at
  `assets/icon-production.png` and the matching splash asset at
  `assets/splash-production.png`.
- Before the first production build, add the final `ios.bundleIdentifier` to
  `app.json`, then initialize the EAS project and run:

```sh
npx eas-cli@latest init --account <expo-account>
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest submit --platform ios --profile production
```

The App Store Connect app record must use the same bundle identifier. Invite
TestFlight testers only after the submitted build has finished processing.

## Run

Use Node.js 22.13+ (verified with Node 24) and npm.

```sh
npm ci
npm run ios
```

The iOS command starts Metro and opens Expo Go in an installed Xcode simulator.
On a physical iPhone, install an SDK 57-compatible Expo Go, run `npm start`,
and scan the QR code on the same network. Haptics require a physical device
for a meaningful feel check. A web visual preview is available with `npm run web`.

## Implemented

- Today, Habits, and Progress tabs, plus modal settings.
- Semantic light/dark tokens and system appearance by default.
- Turkish and English UI support, with the device language used initially and a saved in-app language preference.
- SQLite-backed habit management and reversible, persisted Today check-ins.
- Animated progress and press feedback, respecting Reduce Motion.
- Subtle iOS selection haptics; unavailable haptics do not interrupt check-ins.
- Real streak and completion metrics, plus a lightweight six-month heatmap.
- Accessible completion states, controls, error messages, and scrollable layouts.

Check-ins survive app restarts and the Today list follows the local calendar day,
refreshing every 30 seconds and on foregrounding. Progress and streak values are
derived from the saved local data. Appearance is session-only.

## Code map

- `app/`: routes and screen composition.
- `components/`: shared habit rows, typography, headers, progress bar, and heatmap.
- `theme/`: semantic tokens and appearance context.
- `features/`: SQLite repositories, domain types, streak logic, progress metrics,
  and local reminder scheduling.
- `hooks/`: local-clock refresh and Reduce Motion subscription.
- `lib/`: local calendar formatting, percentage calculation, and haptics.
- `tests/`: date, percentage, schedule-query, migration, and persistence tests.

## Validation

```sh
npm run typecheck
npm run lint
npm test
npx expo install --check
npx expo export --platform ios
```

Verified on September 10, 2026:

- Typecheck and lint pass.
- All nine domain and SQLite integration tests pass. Earlier timezone-specific
  runs exercised local dates on either side of UTC.
- Expo dependency compatibility check passes; production iOS bundle exports.
- Expo Go launches on an iPhone 17 Pro simulator (iOS 26).
- Native Today completion changes 0/4 to 1/4; undo returns to 0/4.
- Native Today, Habits, Progress, and settings navigation work; light and dark
  screens were visually inspected.
- Browser preview verified all four completions, Perfect day, undo to 3/4,
  tab navigation, and light appearance selection. No browser errors were reported.

Remaining manual checks: haptic feel, reminder delivery, device appearance
changes while System is selected, and a broader Dynamic Type/device-size pass on
a physical iPhone. The app was not visually previewed in this Phase 8 pass because
the workspace browser automation executable was unavailable.
The Expo template icon remains a development placeholder until Phase 9.

## Phase 2 storage

Native startup opens `habit-tracker.db` with `expo-sqlite`, enables foreign keys
and WAL, and runs transactional migrations before rendering routes. Startup
errors show a retry action; the app never deletes an incompatible database.
Web remains a visual preview and does not open SQLite.

- `db/schema.ts`: habits, schedule weekdays (Monday=1 through Sunday=7),
  completion uniqueness, cascading foreign keys, and the date index.
- `db/migrations.ts`: ordered migrations tracked with `PRAGMA user_version`.
  A failed migration rolls back; a newer schema is rejected without modification.
- `db/DatabaseProvider.tsx`: native initialization and error handling.
- `features/habits/habit.repository.ts`: list/get/save/archive/delete APIs,
  transactional schedule replacement, and parameterized SQL.
- `features/completions/completion.repository.ts`: list/add/remove APIs;
  repeated completion writes are idempotent by habit and local date.
- `tests/database.test.ts`: real file-backed SQLite tests using Node's SQLite
  engine through the same SQL interface. Fixtures stay in temporary databases;
  no sample habits are silently inserted into the app's database.

Stored repository data persists across database reopen. There is no streak
engine yet.

Phase 2 verification: typecheck, lint, all seven tests, Expo dependency check,
and production iOS export pass. The running iOS simulator created all three
tables at schema version 1 and SQLite reported `integrity_check = ok`.
Repository persistence was verified with a file close/reopen integration test;
full app restart with user-entered data awaits the later screen integration.

## Phase 3 habit management

The native Habits tab reads SQLite and has Active and Archived collections.
Add Habit opens a form with name validation, eight icons, six colors, and daily
or selected-weekday frequency. Selecting a saved habit opens the same editor.
Save, archive, restore, and confirmed permanent deletion all use the repository;
screens contain no SQL. Archiving preserves completion history. Deletion removes
it through the existing foreign key cascade. Forms guard duplicate submissions
and show write errors without discarding entered values.

Progress remains a Phase 1 preview pending its roadmap phase.
The web Habits screen directs users to iOS rather than pretending to persist data.
Reminder scheduling remains Phase 7.

Validation: typecheck, lint, seven existing domain/database tests, and iOS export
pass. Native simulator checks covered create, persisted form values, icon/frequency
editing, archive visibility, and the delete confirmation/cancel path. Repository
integration tests cover actual deletion and cascading history cleanup. The simulator
contains an archived test habit named Eve from this verification.

## Phase 4 Today

The native Today tab now queries active habits scheduled for the user's local
weekday and joins each habit's completion state for the exact local
`YYYY-MM-DD`. Check-ins update optimistically, persist in SQLite, survive app
restarts, and can be undone with a second tap. Failed writes roll back the UI
and show an error. Daily progress and the restrained Perfect Day state are
derived from stored habits, with loading, query failure, and no-schedule empty
states included.

Schedule filtering uses the documented ISO weekday convention (Monday = 1,
Sunday = 7). Repository tests cover daily versus selected-weekday schedules,
archived exclusion, and date-specific completion state. Progress remains sample
data until Phase 6; streak metrics belong to Phase 5.

Phase 4 verification: typecheck, lint, all nine tests, Expo dependency check,
and production iOS export pass. Native interaction still needs a fresh simulator
or physical-device pass for persisted check-in and undo behavior.
