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

## Pending Apple Developer setup — iCloud Sync (Phase 20)

Cloud sync is intentionally not enabled until the following Apple Developer
account work is complete. Local SQLite remains the source of truth in the
meantime; turning on an entitlement without a provisioned CloudKit container
must not be treated as a working sync release.

1. In **Certificates, Identifiers & Profiles**, enable **iCloud** and **Push
   Notifications** for `com.furkanozbek.habit-tracker`.
2. Create the private CloudKit container
   `iCloud.com.furkanozbek.habit-tracker`, associate it with that App ID, and
   enable the CloudKit service.
3. Create or regenerate development, Ad Hoc/TestFlight, and App Store
   provisioning profiles after the capabilities change. Enable background
   remote notifications for the app target.
4. In CloudKit Dashboard, deploy the development schema to production only
   after two-device testing passes. Do not use a public database for personal
   habit data.
5. Test with two signed-in physical devices: offline edits, reconnect,
   concurrent edits, deletes/tombstones, sign-out, and a CloudKit service
   outage. Confirm sync errors cannot overwrite or delete local data.

The planned implementation uses CloudKit's private database and `CKSyncEngine`.
It requires persisted sync-engine state plus app-specific handling for conflicts;
the local conflict ordering is revision, timestamp, then device identifier.

## Deferred Apple-platform verification

These checks require signing capabilities, provisioned identifiers, or physical
hardware and are intentionally deferred until the Apple Developer account is
available:

- Enable and provision App Groups for widgets/App Intents, HealthKit, Siri,
  WatchConnectivity, iCloud/CloudKit, and remote notifications on every related
  app/extension identifier.
- Verify widget interactive actions and Lock Screen families on a signed iPhone;
  confirm archived/deleted habits disappear from snapshots.
- Run Siri/App Intent actions from Siri and Shortcuts, including invalid and
  archived habit handling.
- Verify Health permissions and imports for steps, distance, workouts, mindful
  minutes, and water with real Health data.
- Verify phone/Watch offline actions, reconnect convergence, timer controls,
  complication/Smart Stack behavior, and background delivery on a paired Watch.
- Verify reminder delivery, completion cancellation, multiple daily times,
  incomplete follow-ups, and duration-timer goal alerts on a physical iPhone.
- Create the production EAS build, upload it to App Store Connect, complete
  TestFlight smoke testing, then run the documented 14-day and 30-day validation.

All of these are release gates; simulator or unsigned builds are not evidence
that the corresponding system integration works on hardware.

## V2 local implementation status

Phases 10–19 and the local portions of Phases 20–23 are implemented. The latest
local pass adds persistent duration timer controls, daily/Today/single-habit and
heatmap widgets, validated transactional backup/restore, deterministic sync
metadata, search/filter/sort/drag ordering, templates, duplication, confirmed
bulk archive, multiple schedule-aware reminders, incomplete follow-ups, timer
goal alerts, and uncapped Dynamic Type text scaling.

Validation on September 14, 2026: TypeScript and lint pass, 27 domain/database
tests pass, Expo dependency compatibility passes, production iOS JS export
passes, native prebuild and CocoaPods installation pass, and the Watch extension
compiles directly for watchOS Simulator. A combined unsigned iOS scheme build is
currently blocked by Xcode evaluating the legacy Watch app product types under
the iOS Simulator destination; signed device/TestFlight verification remains in
the deferred checklist above.

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
