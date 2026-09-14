export type FrequencyType = "daily" | "specific_days";
export type ScheduleType =
  | "daily"
  | "weekdays"
  | "times_per_week"
  | "times_per_month"
  | "days_of_month"
  | "interval";

/**
 * A schedule is a calendar rule. `startDate` and `endDate` are inclusive
 * local calendar identities; they deliberately are not timestamps.
 */
export interface HabitSchedule {
  type: ScheduleType;
  weekdays: number[];
  daysOfMonth: number[];
  intervalDays: number | null;
  occurrences: number | null;
  startDate: string;
  endDate: string | null;
}

export interface ScheduleVersion extends HabitSchedule {
  id: string;
  habitId: string;
  effectiveFrom: string;
  effectiveUntil: string | null;
}
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
  groupId: string | null;
  groupName?: string | null;
  sortOrder: number;
  /** The current schedule. Legacy fields below remain for V1 UI compatibility. */
  schedule?: HabitSchedule;
  frequencyType: FrequencyType;
  scheduledDays: number[];
  reminderEnabled: boolean;
  reminderTime: string | null;
  reminderTimes?: string[];
  followUpMinutes?: number | null;
  createdAt: string;
  archivedAt: string | null;
}

export interface TodayHabit extends Habit {
  completedToday: boolean;
  progressValue: number;
  progressState: import("../completions/completion.types.ts").ProgressState | null;
}
