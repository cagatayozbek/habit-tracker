import type { TodayHabit } from "../habits/habit.types";
import { isExpoGo } from "../../lib/runtime";

/** Native widget code is absent from Expo Go, so every import must stay lazy. */
export async function updateTodayWidgets(habits: readonly TodayHabit[], percentage: number): Promise<void> {
  if (isExpoGo) return;
  try {
    const [{ default: DailyProgressWidget }, { default: TodayHabitsWidget }, { default: SingleHabitWidget }] = await Promise.all([
      import("../../widgets/DailyProgressWidget"),
      import("../../widgets/TodayHabitsWidget"),
      import("../../widgets/SingleHabitWidget"),
    ]);
    const completed = habits.filter((habit) => habit.completedToday).length;
    DailyProgressWidget.updateSnapshot({ completed, total: habits.length, percentage, label: "Today" });
    TodayHabitsWidget.updateSnapshot({ habits: habits.map((habit) => ({ id: habit.id, name: habit.name, completed: habit.completedToday })) });
    const first = habits[0];
    if (first) SingleHabitWidget.updateSnapshot({ id: first.id, name: first.name, value: first.progressValue, target: first.targetValue, completed: first.completedToday, type: first.type });
  } catch {
    // Expo Go does not ship ExpoWidgets. Widgets remain available in development/production builds.
  }
}

export async function updateHeatmapWidget(levels: number[], percentage: number): Promise<void> {
  if (isExpoGo) return;
  try {
    const { default: ConsistencyHeatmapWidget } = await import("../../widgets/ConsistencyHeatmapWidget");
    ConsistencyHeatmapWidget.updateSnapshot({ levels, percentage });
  } catch {
    // See updateTodayWidgets.
  }
}

export async function subscribeToWidgetInteractions(listener: (target: string) => void): Promise<() => void> {
  if (isExpoGo) return () => undefined;
  try {
    const { addUserInteractionListener } = await import("expo-widgets");
    const subscription = addUserInteractionListener((event) => listener(event.target));
    return () => subscription.remove();
  } catch {
    return () => undefined;
  }
}
