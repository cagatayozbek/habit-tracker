# Phase 18 — Apple Watch device verification

Run this on a paired physical iPhone and Apple Watch; WatchConnectivity background transfers are not fully supported by Simulator.

1. Build the iOS app and confirm that the companion Watch app installs.
2. Open the phone app, create a check habit, a count habit, and a duration habit scheduled for today. Confirm the Watch shows the same total and progress.
3. Complete the check habit and increment the count on Watch. Reopen Today on iPhone and confirm the canonical SQLite progress changed once per action.
4. Start and pause a duration timer on Watch. Confirm the phone shows the same active/paused timer state and elapsed time remains timestamp-correct after backgrounding.
5. Turn off Bluetooth or move the phone out of range, perform an action on Watch, then reconnect. Confirm the queued action applies once and the refreshed snapshot matches the phone.
6. Archive a displayed habit on the phone, refresh Today, and confirm it disappears from Watch.

Record watchOS/iOS versions and any pairing, delivery, or signing failures before TestFlight distribution.
