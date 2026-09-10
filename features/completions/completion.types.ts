export interface HabitCompletion {
  id: string;
  habitId: string;
  /** User-local YYYY-MM-DD, independent of completedAt's timezone. */
  completionDate: string;
  completedAt: string;
}

export type ProgressState = "active" | "completed" | "failed" | "skipped";

/** A stored fact for one local calendar day. Duration values are seconds. */
export interface ProgressEntry {
  id: string;
  habitId: string;
  localDate: string;
  value: number;
  state: ProgressState;
  recordedAt: string;
  note: string | null;
}
