import type { Habit } from "../habits/habit.types.ts";

export type HealthMetric = "steps" | "distance" | "workouts" | "mindful_minutes" | "water";
export interface HealthMapping { habitId: string; metric: HealthMetric; lastSyncedAt: string | null; }
export interface NormalizedHealthSample { id: string; localDate: string; value: number; }

export const healthMetricLabels: Record<HealthMetric, string> = {
  steps: "Steps", distance: "Walking + running distance", workouts: "Workouts", mindful_minutes: "Mindful time", water: "Water",
};

export function compatibleHealthMetrics(habit: Pick<Habit, "type" | "unit">): HealthMetric[] {
  if (habit.type === "count") return ["steps", "workouts"];
  if (habit.type === "duration") return ["mindful_minutes"];
  if (habit.type !== "quantity") return [];
  const unit = habit.unit?.trim().toLocaleLowerCase();
  if (["m", "meter", "meters", "metre", "metres", "km", "kilometer", "kilometers", "kilometre", "kilometres", "mi", "mile", "miles"].includes(unit ?? "")) return ["distance"];
  if (["ml", "milliliter", "milliliters", "millilitre", "millilitres", "l", "liter", "liters", "litre", "litres"].includes(unit ?? "")) return ["water"];
  return [];
}

/** Converts the adapter's base units (m, mL, seconds) into the habit's unit. */
export function healthValueForHabit(metric: HealthMetric, baseValue: number, habit: Pick<Habit, "type" | "unit">): number {
  if (!Number.isFinite(baseValue) || baseValue < 0 || !compatibleHealthMetrics(habit).includes(metric)) throw new Error("Health metric is incompatible with this habit.");
  const unit = habit.unit?.trim().toLocaleLowerCase();
  if (metric === "distance") {
    if (["km", "kilometer", "kilometers", "kilometre", "kilometres"].includes(unit ?? "")) return baseValue / 1000;
    if (["mi", "mile", "miles"].includes(unit ?? "")) return baseValue / 1609.344;
  }
  if (metric === "water" && ["l", "liter", "liters", "litre", "litres"].includes(unit ?? "")) return baseValue / 1000;
  return baseValue;
}
