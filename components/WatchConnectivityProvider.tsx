import { useCallback, useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import { useHabitRepository } from "../hooks/useHabitRepository";
import { useCompletionRepository } from "../hooks/useCompletionRepository";
import { useProgressRepository } from "../hooks/useProgressRepository";
import { useTimerService } from "../hooks/useTimerService";
import { currentTimestamp, localDateKey, localWeekday } from "../lib/dates";
import { localIdentifier } from "../lib/ids";
import { progressStateForValue } from "../lib/goals";
import { consumePendingWatchActions, publishWatchSnapshot, subscribeToWatchActions, type WatchAction } from "../lib/watchConnectivity";

let refreshFromMutation: (() => void) | null = null;
/** Call after a phone-side Today mutation so the Watch receives the same canonical result. */
export function notifyWatchDataChanged() { refreshFromMutation?.(); }

/** Bridges only compact Today state; SQLite remains the phone's canonical store. */
export function WatchConnectivityProvider() {
  const habits = useHabitRepository();
  const completions = useCompletionRepository();
  const progress = useProgressRepository();
  const timer = useTimerService();
  const working = useRef(new Set<string>());

  const refresh = useCallback(async () => {
    if (Platform.OS !== "ios") return;
    const now = new Date();
    const date = localDateKey(now);
    const today = await habits.listScheduledForDate(date, localWeekday(now));
    const activeTimer = await timer.get();
    await publishWatchSnapshot({
      version: 1, date, generatedAt: currentTimestamp(),
      completed: today.filter((habit) => habit.completedToday).length, total: today.length,
      activeTimerHabitId: activeTimer?.startedAt ? activeTimer.habitId : null,
      habits: today.map((habit) => ({ id: habit.id, name: habit.name, type: habit.type, value: habit.progressValue, target: habit.targetValue, unit: habit.unit, completed: habit.completedToday })),
    });
  }, [habits, timer]);

  const apply = useCallback(async (action: WatchAction) => {
    const key = action.id ?? `${action.command}:${action.habitId}`;
    if (working.current.has(key)) return;
    working.current.add(key);
    try {
      const now = new Date();
      const date = localDateKey(now);
      const habit = await habits.get(action.habitId);
      if (!habit || habit.archivedAt) return;
      if (action.command === "complete" && habit.type === "check") {
        await completions.add({ id: localIdentifier(), habitId: habit.id, completionDate: date, completedAt: currentTimestamp() });
      } else if (action.command === "increment" && habit.type === "count") {
        const today = await habits.listScheduledForDate(date, localWeekday(now));
        const current = today.find((item) => item.id === habit.id)?.progressValue ?? 0;
        const value = current + 1;
        await progress.save({ id: localIdentifier(), habitId: habit.id, localDate: date, value, state: progressStateForValue(value, habit.targetValue), recordedAt: currentTimestamp(), note: null }, habit.targetValue);
      } else if (action.command === "timer-start" && habit.type === "duration") {
        await timer.start(habit.id, currentTimestamp());
      } else if (action.command === "timer-pause") {
        const active = await timer.get();
        if (active?.habitId === habit.id) await timer.pause(currentTimestamp());
      }
    } finally {
      working.current.delete(key);
      await refresh().catch(() => undefined);
    }
  }, [completions, habits, progress, refresh, timer]);

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    void refresh().catch(() => undefined);
    void consumePendingWatchActions().then((actions) => Promise.all(actions.map(apply))).catch(() => undefined);
    const unsubscribe = subscribeToWatchActions((action) => { void apply(action); });
    const appState = AppState.addEventListener("change", (state) => { if (state === "active") void refresh().catch(() => undefined); });
    refreshFromMutation = () => { void refresh().catch(() => undefined); };
    return () => { refreshFromMutation = null; unsubscribe(); appState.remove(); };
  }, [apply, refresh]);
  return null;
}
