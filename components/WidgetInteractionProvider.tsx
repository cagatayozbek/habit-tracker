import { useEffect } from "react";
import { Platform } from "react-native";
import { addUserInteractionListener } from "expo-widgets";
import { useHabitRepository } from "../hooks/useHabitRepository";
import { useProgressRepository } from "../hooks/useProgressRepository";
import { currentTimestamp, localDateKey, localWeekday } from "../lib/dates";
import { localIdentifier } from "../lib/ids";
import DailyProgressWidget from "../widgets/DailyProgressWidget";
import TodayHabitsWidget from "../widgets/TodayHabitsWidget";
import SingleHabitWidget from "../widgets/SingleHabitWidget";
import { completionPercentage } from "../lib/progress";

export function WidgetInteractionProvider() {
  const habits = useHabitRepository();
  const progress = useProgressRepository();
  useEffect(() => {
    if (Platform.OS !== "ios") return;
    const subscription = addUserInteractionListener((event) => {
      void (async () => {
        const [action, habitId] = event.target.split(":");
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
        DailyProgressWidget.updateSnapshot({ completed, total: today.length, percentage: completionPercentage(completed, today.length), label: "Today" });
        TodayHabitsWidget.updateSnapshot({ habits: today.map((item) => ({ id: item.id, name: item.name, completed: item.completedToday })) });
        const selected = today.find((item) => item.id === habitId) ?? today[0];
        if (selected) SingleHabitWidget.updateSnapshot({ id: selected.id, name: selected.name, value: selected.progressValue, target: selected.targetValue, completed: selected.completedToday, type: selected.type });
      })().catch(() => undefined);
    });
    return () => subscription.remove();
  }, [habits, progress]);
  return null;
}
