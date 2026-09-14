import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import type { Habit } from "../habits/habit.types";
import { localDateKey } from "../../lib/dates";
import { scheduleMatchesDate } from "../../lib/schedules";

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
  if (habit.schedule) return scheduleMatchesDate(habit.schedule, localDateKey(date));
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

export async function cancelTimerReminder(habitId: string): Promise<void> {
  if (!nativeNotificationsAvailable()) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(scheduled.filter((item) => item.content.data?.timerHabitId === habitId).map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)));
}

/** Schedules one goal-reached alert for a running duration timer. */
export async function syncTimerReminder(habit: Habit, accumulatedSeconds: number): Promise<void> {
  await cancelTimerReminder(habit.id);
  const remaining = habit.targetValue - accumulatedSeconds;
  if (!nativeNotificationsAvailable() || remaining <= 0 || !(await requestReminderPermission())) return;
  await Notifications.scheduleNotificationAsync({ content: { title: habit.name, body: "Your duration goal is complete.", sound: "default", data: { habitId: habit.id, timerHabitId: habit.id, kind: "timer" } }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(Date.now() + remaining * 1000) } });
}

/** Replaces this habit's pending local reminders with its next local occurrences. */
export async function syncHabitReminders(
  habit: Habit,
  options: { completedToday?: boolean } = {},
): Promise<void> {
  await cancelHabitReminders(habit.id);
  const times = [...new Set(habit.reminderTimes ?? (habit.reminderTime ? [habit.reminderTime] : []))].map(parseReminderTime).filter((time): time is ReminderTime => time !== null);
  if (!nativeNotificationsAvailable() || habit.archivedAt || !habit.reminderEnabled || !times.length || !(await requestReminderPermission())) return;

  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const requests: Promise<string>[] = [];
  for (let offset = 0; offset < reminderWindowDays; offset += 1) {
    const occurrence = new Date(start);
    occurrence.setDate(start.getDate() + offset);
    if (!isScheduledOn(habit, occurrence) || (offset === 0 && options.completedToday)) continue;
    for (const time of times) {
      occurrence.setHours(time.hour, time.minute, 0, 0);
      if (occurrence <= now) continue;
      const reminderKey = `${habit.id}:${localDateKey(occurrence)}:${time.hour}:${time.minute}:primary`;
      requests.push(Notifications.scheduleNotificationAsync({
        content: {
          title: habit.name,
          body: "A small moment for your habit.",
          sound: "default",
          data: { habitId: habit.id, reminderKey, kind: "primary" },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: occurrence },
      }));
      if (habit.followUpMinutes) {
        const followUp = new Date(occurrence.getTime() + habit.followUpMinutes * 60_000);
        if (followUp > now) requests.push(Notifications.scheduleNotificationAsync({ content: { title: habit.name, body: "Still incomplete? A gentle follow-up.", sound: "default", data: { habitId: habit.id, reminderKey: `${reminderKey}:follow-up`, kind: "follow-up" } }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: followUp } }));
      }
    }
  }
  await Promise.all(requests);
}
