import type { Habit } from "../habits/habit.types.ts";
import type { HealthMapping, HealthMetric, NormalizedHealthSample } from "./health.types.ts";
import { healthValueForHabit } from "./health.types.ts";

export function aggregateHealthSamples(samples: readonly NormalizedHealthSample[]): Map<string, number> {
  const unique = new Map(samples.map((sample) => [sample.id, sample]));
  const totals = new Map<string, number>();
  for (const sample of unique.values()) totals.set(sample.localDate, (totals.get(sample.localDate) ?? 0) + sample.value);
  return totals;
}

export function normalizedValuesForHabit(metric: HealthMetric, samples: readonly NormalizedHealthSample[], habit: Pick<Habit, "type" | "unit">): Map<string, number> {
  return new Map([...aggregateHealthSamples(samples)].map(([date, value]) => [date, healthValueForHabit(metric, value, habit)]));
}

export function mappedMetrics(mappings: readonly HealthMapping[]): HealthMetric[] {
  return [...new Set(mappings.map((mapping) => mapping.metric))];
}
