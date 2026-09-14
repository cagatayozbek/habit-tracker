import { useCallback } from "react";
import { useHabitRepository } from "./useHabitRepository";
import { useHealthRepository } from "./useHealthRepository";
import { currentTimestamp } from "../lib/dates";
import { isHealthAvailable, readHealthMetric, requestHealthAuthorization } from "../features/health/health.adapter";
import { mappedMetrics, normalizedValuesForHabit } from "../features/health/health.service";
import type { HealthMetric } from "../features/health/health.types";
import { compatibleHealthMetrics } from "../features/health/health.types";

export function useHealthSync() {
  const health = useHealthRepository();
  const habits = useHabitRepository();
  const setMapping = useCallback(async (habitId: string, metric: HealthMetric | null) => {
    if (metric !== null) {
      const habit = await habits.get(habitId);
      if (!habit || habit.archivedAt !== null) throw new Error("Habit is archived or no longer exists.");
      if (!compatibleHealthMetrics(habit).includes(metric)) throw new Error("That Apple Health metric is incompatible with this habit type or unit.");
      if (!(await isHealthAvailable())) throw new Error("Apple Health is not available on this device.");
      if (!(await requestHealthAuthorization([metric]))) throw new Error("Apple Health access was not granted.");
    }
    await health.setMapping(habitId, metric);
  }, [habits, health]);
  const sync = useCallback(async () => {
    if (!(await isHealthAvailable())) throw new Error("Apple Health is not available on this device.");
    const mappings = await health.listMappings();
    if (!mappings.length) return 0;
    if (!(await requestHealthAuthorization(mappedMetrics(mappings)))) throw new Error("Apple Health access was not granted.");
    const end = new Date(); end.setHours(0, 0, 0, 0); end.setDate(end.getDate() + 1);
    const start = new Date(end); start.setDate(start.getDate() - 30);
    const samples = new Map<HealthMetric, Awaited<ReturnType<typeof readHealthMetric>>>();
    for (const metric of mappedMetrics(mappings)) samples.set(metric, await readHealthMetric(metric, start, end));
    const activeHabits = new Map((await habits.list()).map((habit) => [habit.id, habit]));
    let updated = 0;
    for (const mapping of mappings) {
      const habit = activeHabits.get(mapping.habitId);
      if (!habit) continue;
      const values = normalizedValuesForHabit(mapping.metric, samples.get(mapping.metric) ?? [], habit);
      await health.applyDailyValues(habit.id, mapping.metric, habit.targetValue, values, currentTimestamp());
      updated += values.size;
    }
    return updated;
  }, [habits, health]);
  return { setMapping, sync };
}
