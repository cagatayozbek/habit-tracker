import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Label, Screen } from "../components/ui";
import { useHabitRepository } from "../hooks/useHabitRepository";
import { useProgressRepository } from "../hooks/useProgressRepository";
import { useTimerService } from "../hooks/useTimerService";
import { currentTimestamp, localDateKey } from "../lib/dates";
import { localIdentifier } from "../lib/ids";
import { intentProgressValue, resolveIntentHabit, type AppIntentCommand } from "../lib/appIntent";
import { progressStateForValue } from "../lib/goals";

const commands: readonly AppIntentCommand[] = ["complete", "add-progress", "start-timer"];

export default function IntentRoute() {
  const params = useLocalSearchParams<{ command?: string; habit?: string; amount?: string }>();
  const habits = useHabitRepository();
  const progress = useProgressRepository();
  const timer = useTimerService();
  const performed = useRef(false);
  const [message, setMessage] = useState("Working on your shortcut…");

  useEffect(() => {
    if (performed.current) return;
    performed.current = true;
    const run = async () => {
      const command = params.command as AppIntentCommand;
      if (!commands.includes(command)) throw new Error("This shortcut is no longer supported.");
      const habit = resolveIntentHabit(await habits.list(true), params.habit ?? "");
      if (!habit) throw new Error("That habit is archived or no longer exists.");
      if (command === "start-timer") {
        await timer.start(habit.id, currentTimestamp());
        setMessage(`${habit.name} timer started.`);
      } else {
        const date = localDateKey(new Date());
        const existing = (await progress.list(habit.id)).find((entry) => entry.localDate === date);
        const value = intentProgressValue(habit, existing?.value ?? 0, command, Number(params.amount));
        await progress.save({ id: existing?.id ?? localIdentifier(), habitId: habit.id, localDate: date, value, state: progressStateForValue(value, habit.targetValue), recordedAt: currentTimestamp(), note: existing?.note ?? null }, habit.targetValue);
        setMessage(command === "complete" ? `${habit.name} completed.` : `Progress added to ${habit.name}.`);
      }
      setTimeout(() => router.replace("/(tabs)"), 700);
    };
    run().catch((error: unknown) => setMessage(error instanceof Error ? error.message : "The shortcut could not be completed."));
  }, [habits, params.amount, params.command, params.habit, progress, timer]);

  return <Screen><View style={{ flex: 1, justifyContent: "center", gap: 12 }}><Label style={{ fontSize: 28, fontWeight: "600" }}>Habit Tracker</Label><Label secondary accessibilityRole="alert">{message}</Label></View></Screen>;
}
