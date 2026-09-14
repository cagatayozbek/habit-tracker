import { useCallback, useState } from "react";
import { Platform, Pressable, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Label, styles } from "./ui";
import { ActionButton } from "./ActionButton";
import { useTheme } from "../theme/ThemeProvider";
import { useHabitRepository } from "../hooks/useHabitRepository";
import { useHealthRepository } from "../hooks/useHealthRepository";
import { useHealthSync } from "../hooks/useHealthSync";
import type { Habit } from "../features/habits/habit.types";
import { compatibleHealthMetrics, healthMetricLabels, type HealthMapping, type HealthMetric } from "../features/health/health.types";

export function HealthSettings() {
  const { colors } = useTheme();
  const habitsRepo = useHabitRepository();
  const healthRepo = useHealthRepository();
  const healthSync = useHealthSync();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [mappings, setMappings] = useState<HealthMapping[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(Platform.OS === "ios" ? "Choose a metric to opt in. Manual tracking stays available." : "Apple Health is available only on iPhone.");
  const load = useCallback(async () => {
    setHabits((await habitsRepo.list()).filter((habit) => compatibleHealthMetrics(habit).length > 0));
    setMappings(await healthRepo.listMappings());
  }, [habitsRepo, healthRepo]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const choose = async (habitId: string, metric: HealthMetric | null) => {
    if (busy) return;
    setBusy(true);
    try {
      await healthSync.setMapping(habitId, metric);
      await load();
      setMessage(metric ? "Apple Health access enabled. Tap Sync now to import the last 30 days." : "Apple Health mapping removed; manual progress was preserved.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Apple Health could not be configured."); }
    finally { setBusy(false); }
  };
  const sync = async () => {
    if (busy) return;
    setBusy(true);
    try { const days = await healthSync.sync(); await load(); setMessage(`Apple Health synced ${days} daily value${days === 1 ? "" : "s"}.`); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Apple Health sync failed. Manual tracking is unchanged."); }
    finally { setBusy(false); }
  };
  return <View style={{ gap: 14 }}>
    <Label style={styles.heading}>Apple Health</Label>
    <Label secondary style={{ lineHeight: 22 }}>{message}</Label>
    {Platform.OS === "ios" ? habits.map((habit) => {
      const selected = mappings.find((mapping) => mapping.habitId === habit.id)?.metric ?? null;
      return <View key={habit.id} style={{ gap: 9, paddingVertical: 10, borderBottomWidth: 1, borderColor: colors.border }}>
        <Label style={{ fontWeight: "600" }}>{habit.name}</Label>
        <View style={[styles.row, { flexWrap: "wrap", gap: 8 }]}>
          <Pressable disabled={busy} accessibilityRole="radio" accessibilityState={{ checked: selected === null }} accessibilityLabel={`${habit.name}, manual only`} onPress={() => void choose(habit.id, null)} style={{ padding: 11, borderRadius: 12, backgroundColor: selected === null ? colors.successSoft : colors.surface }}><Label secondary>Manual only</Label></Pressable>
          {compatibleHealthMetrics(habit).map((metric) => <Pressable key={metric} disabled={busy} accessibilityRole="radio" accessibilityState={{ checked: selected === metric }} accessibilityLabel={`${habit.name}, ${healthMetricLabels[metric]}`} onPress={() => void choose(habit.id, metric)} style={{ padding: 11, borderRadius: 12, backgroundColor: selected === metric ? colors.successSoft : colors.surface }}><Label>{healthMetricLabels[metric]}</Label></Pressable>)}
        </View>
      </View>;
    }) : null}
    {Platform.OS === "ios" && mappings.length ? <ActionButton title={busy ? "Syncing…" : "Sync now"} disabled={busy} onPress={() => void sync()} /> : null}
  </View>;
}
