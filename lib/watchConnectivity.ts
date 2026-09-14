import { NativeEventEmitter, NativeModules, Platform } from "react-native";

export type WatchAction = {
  id?: string;
  command: "complete" | "increment" | "timer-start" | "timer-pause";
  habitId: string;
};

export type WatchSnapshot = {
  version: 1;
  date: string;
  generatedAt: string;
  completed: number;
  total: number;
  activeTimerHabitId: string | null;
  habits: Array<{ id: string; name: string; type: "check" | "count" | "quantity" | "duration"; value: number; target: number; unit: string | null; completed: boolean }>;
};

type NativeWatchModule = {
  publishSnapshot(snapshot: WatchSnapshot): Promise<void>;
  consumePendingActions(): Promise<WatchAction[]>;
};

const native = NativeModules.HabitTrackerWatchConnectivity as NativeWatchModule | undefined;

export async function publishWatchSnapshot(snapshot: WatchSnapshot): Promise<void> {
  if (Platform.OS === "ios" && native) await native.publishSnapshot(snapshot);
}

export async function consumePendingWatchActions(): Promise<WatchAction[]> {
  return Platform.OS === "ios" && native ? native.consumePendingActions() : [];
}

export function subscribeToWatchActions(listener: (action: WatchAction) => void): (() => void) {
  if (Platform.OS !== "ios" || !native) return () => undefined;
  const subscription = new NativeEventEmitter(native as never).addListener("HabitTrackerWatchAction", listener);
  return () => subscription.remove();
}
