export type FrequencyType = "daily" | "specific_days";
export type HabitType = "check" | "count" | "quantity" | "duration";
export type GoalPeriod = "daily" | "weekly" | "monthly";
/** ISO weekdays: Monday = 1, Sunday = 7. Daily habits store no weekday rows. */
export interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string | null;
  type: HabitType;
  targetValue: number;
  unit: string | null;
  goalPeriod: GoalPeriod;
  frequencyType: FrequencyType;
  scheduledDays: number[];
  reminderEnabled: boolean;
  reminderTime: string | null;
  createdAt: string;
  archivedAt: string | null;
}

export interface TodayHabit extends Habit {
  completedToday: boolean;
  progressValue: number;
  progressState: import("../completions/completion.types.ts").ProgressState | null;
}
