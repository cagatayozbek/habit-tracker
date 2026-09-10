export type FrequencyType = "daily" | "specific_days";
/** ISO weekdays: Monday = 1, Sunday = 7. Daily habits store no weekday rows. */
export interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string;
  frequencyType: FrequencyType;
  scheduledDays: number[];
  reminderEnabled: boolean;
  reminderTime: string | null;
  createdAt: string;
  archivedAt: string | null;
}

export interface TodayHabit extends Habit {
  completedToday: boolean;
}
