import { localDateKey } from "../../lib/dates";
import type { HealthMetric, NormalizedHealthSample } from "./health.types";
import { isExpoGo } from "../../lib/runtime";

const identifiers = {
  steps: "HKQuantityTypeIdentifierStepCount",
  distance: "HKQuantityTypeIdentifierDistanceWalkingRunning",
  workouts: "HKWorkoutTypeIdentifier",
  mindful_minutes: "HKCategoryTypeIdentifierMindfulSession",
  water: "HKQuantityTypeIdentifierDietaryWater",
} as const;

async function healthKit() {
  if (isExpoGo) return null;
  try { return await import("@kingstinct/react-native-healthkit"); }
  catch { return null; }
}

export async function isHealthAvailable(): Promise<boolean> {
  const kit = await healthKit();
  return kit?.isHealthDataAvailable() ?? false;
}
export async function requestHealthAuthorization(metrics: readonly HealthMetric[]): Promise<boolean> {
  const kit = await healthKit();
  if (!kit?.isHealthDataAvailable()) return false;
  return kit.requestAuthorization({ toRead: [...new Set(metrics.map((metric) => identifiers[metric]))] });
}

export async function readHealthMetric(metric: HealthMetric, start: Date, end: Date): Promise<NormalizedHealthSample[]> {
  const kit = await healthKit();
  if (!kit) return [];
  const filter = { date: { startDate: start, endDate: end, strictStartDate: true, strictEndDate: true } };
  if (metric === "steps" || metric === "distance" || metric === "water") {
    const identifier = identifiers[metric];
    const unit = metric === "steps" ? "count" : metric === "distance" ? "m" : "mL";
    const rows = await kit.queryStatisticsCollectionForQuantity(identifier, ["cumulativeSum"], start, { day: 1 }, { filter, unit });
    return rows.flatMap((row, index) => row.startDate && row.sumQuantity ? [{ id: `${metric}-${index}-${row.startDate.toISOString()}`, localDate: localDateKey(row.startDate), value: row.sumQuantity.quantity }] : []);
  }
  if (metric === "mindful_minutes") {
    const rows = await kit.queryCategorySamples(identifiers.mindful_minutes, { limit: 0, filter });
    return rows.map((row) => ({ id: row.uuid, localDate: localDateKey(row.startDate), value: Math.max(0, (row.endDate.getTime() - row.startDate.getTime()) / 1000) }));
  }
  const workouts = await kit.queryWorkoutSamples({ limit: 0, filter });
  return workouts.map((workout) => {
    const sample = { id: workout.uuid, localDate: localDateKey(workout.startDate), value: 1 };
    workout.dispose();
    return sample;
  });
}
