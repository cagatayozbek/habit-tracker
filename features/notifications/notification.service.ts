import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import type { Habit } from "../habits/habit.types";

const reminderWindowDays = 28;

if (Platform.OS === "ios" || Platform.OS === "android") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export type ReminderTime = { hour: number; minute: number };

export function parseReminderTime(value: string | null): ReminderTime | null {
  if (!value) return null;
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour <= 23 && minute <= 59 ? { hour, minute } : null;
}

export function formatReminderTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function isScheduledOn(habit: Habit, date: Date): boolean {
  if (habit.frequencyType === "daily") return true;
  return habit.scheduledDays.includes(date.getDay() || 7);
}

function nativeNotificationsAvailable(): boolean {
  return Platform.OS === "ios" || Platform.OS === "android";
}

export async function requestReminderPermission(): Promise<boolean> {
  if (!nativeNotificationsAvailable()) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL)
    return true;
  if (!current.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  });
  return requested.granted || requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

export async function cancelHabitReminders(habitId: string): Promise<void> {
  if (!nativeNotificationsAvailable()) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((notification) => notification.content.data?.habitId === habitId)
      .map((notification) => Notifications.cancelScheduledNotificationAsync(notification.identifier)),
  );
}

/** Replaces this habit's pending local reminders with its next local occurrences. */
export async function syncHabitReminders(
  habit: Habit,
  options: { completedToday?: boolean } = {},
): Promise<void> {
  await cancelHabitReminders(habit.id);
  const time = parseReminderTime(habit.reminderTime);
  if (!nativeNotificationsAvailable() || habit.archivedAt || !habit.reminderEnabled || !time || !(await requestReminderPermission())) return;

  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const requests: Promise<string>[] = [];
  for (let offset = 0; offset < reminderWindowDays; offset += 1) {
    const occurrence = new Date(start);
    occurrence.setDate(start.getDate() + offset);
    occurrence.setHours(time.hour, time.minute, 0, 0);
    if (occurrence <= now || !isScheduledOn(habit, occurrence) || (offset === 0 && options.completedToday)) continue;
    requests.push(
      Notifications.scheduleNotificationAsync({
        content: {
          title: habit.name,
          body: "A small moment for your habit.",
          sound: "default",
          data: { habitId: habit.id },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: occurrence },
      }),
    );
  }
  await Promise.all(requests);
}
