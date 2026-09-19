import { useEffect } from "react";
import { Platform } from "react-native";
import { useHabitRepository } from "../hooks/useHabitRepository";
import { useProgressRepository } from "../hooks/useProgressRepository";
import { currentTimestamp, localDateKey, localWeekday } from "../lib/dates";
import { localIdentifier } from "../lib/ids";
import { completionPercentage } from "../lib/progress";
import { subscribeToWidgetInteractions, updateTodayWidgets } from "../features/widgets/widget.bridge";

export function WidgetInteractionProvider() {
  const habits = useHabitRepository();
  const progress = useProgressRepository();
  useEffect(() => {
    if (Platform.OS !== "ios") return;
    let unsubscribe: () => void = () => undefined;
    let cancelled = false;
    void subscribeToWidgetInteractions((target) => {
      void (async () => {
        const [action, habitId] = target.split(":");
        if (!habitId || !["toggle", "increment"].includes(action)) return;
        const habit = await habits.get(habitId);
        if (!habit || habit.archivedAt) return;
        const date = localDateKey(new Date());
        const existing = (await progress.list(habitId)).find((entry) => entry.localDate === date);
        if (action === "toggle" && existing?.state === "completed") await progress.remove(habitId, date);
        else {
          const value = action === "toggle" ? habit.targetValue : (existing?.value ?? 0) + 1;
          await progress.save({ id: localIdentifier(), habitId, localDate: date, value, state: "active", recordedAt: currentTimestamp(), note: null }, habit.targetValue);
        }
        const today = await habits.listScheduledForDate(date, localWeekday(new Date()));
        const completed = today.filter((item) => item.completedToday).length;
        await updateTodayWidgets(today, completionPercentage(completed, today.length));
      })().catch(() => undefined);
    }).then((remove) => { if (cancelled) remove(); else unsubscribe = remove; });
    return () => { cancelled = true; unsubscribe(); };
  }, [habits, progress]);
  return null;
}
