export interface HabitCompletion {
  id: string;
  habitId: string;
  /** User-local YYYY-MM-DD, independent of completedAt's timezone. */
  completionDate: string;
  completedAt: string;
}
