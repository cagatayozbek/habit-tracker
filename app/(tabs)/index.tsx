import { useCallback, useMemo, useRef, useState } from "react";
import { Platform, Pressable, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Screen, Label, styles } from "../../components/ui";
import { ScreenHeader } from "../../components/ScreenHeader";
import { HabitRow } from "../../components/HabitRow";
import { ProgressBar } from "../../components/ProgressBar";
import { ActionButton } from "../../components/ActionButton";
import type { TodayHabit } from "../../features/habits/habit.types";
import { useCompletionRepository } from "../../hooks/useCompletionRepository";
import { useProgressRepository } from "../../hooks/useProgressRepository";
import { useHabitRepository } from "../../hooks/useHabitRepository";
import { useLocalToday } from "../../hooks/useLocalToday";
import {
  currentTimestamp,
  dateHeading,
  greeting,
  localDateKey,
  localWeekday,
} from "../../lib/dates";
import { completionPercentage } from "../../lib/progress";
import { localIdentifier } from "../../lib/ids";
import { useTheme } from "../../theme/ThemeProvider";
import { syncHabitReminders } from "../../features/notifications/notification.service";
import { useTranslation } from "../../lib/i18n";
import { selectionHaptic } from "../../lib/haptics";
import { progressStateForValue } from "../../lib/goals";
import type { ProgressState } from "../../features/completions/completion.types";

export default function Today() {
  const now = useLocalToday();
  const { t, language } = useTranslation();
  if (Platform.OS === "web") {
    return (
      <Screen>
        <ScreenHeader title={t("today")} subtitle={dateHeading(now, language)} />
        <Label>{t("openIosToday")}</Label>
      </Screen>
    );
  }
  return <SavedToday key={localDateKey(now)} now={now} />;
}

function SavedToday({ now }: { now: Date }) {
  const habitsRepo = useHabitRepository();
  const completionsRepo = useCompletionRepository();
  const progressRepo = useProgressRepository();
  const { colors } = useTheme();
  const { t, language } = useTranslation();
  const date = localDateKey(now);
  const weekday = localWeekday(now);
  const [habits, setHabits] = useState<TodayHabit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const pending = useRef(new Set<string>());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setHabits(await habitsRepo.listScheduledForDate(date, weekday));
      setError("");
    } catch {
      setError(t("loadTodayError"));
    } finally {
      setLoading(false);
    }
  }, [date, habitsRepo, t, weekday]);

  useFocusEffect(
    useCallback(() => {
      void retry;
      void load();
    }, [load, retry]),
  );

  const completedCount = useMemo(
    () => habits.filter((habit) => habit.completedToday).length,
    [habits],
  );
  const percentage = completionPercentage(completedCount, habits.length);
  const habitGroups = useMemo(() => {
    const groups = new Map<string, TodayHabit[]>();
    for (const habit of habits) {
      const key = habit.groupName ?? "";
      groups.set(key, [...(groups.get(key) ?? []), habit]);
    }
    return [...groups];
  }, [habits]);

  const toggle = async (habit: TodayHabit) => {
    if (pending.current.has(habit.id)) return;
    pending.current.add(habit.id);
    const completedToday = !habit.completedToday;
    setHabits((current) =>
      current.map((item) =>
        item.id === habit.id ? { ...item, completedToday } : item,
      ),
    );
    try {
      if (completedToday) {
        await completionsRepo.add({
          id: localIdentifier(),
          habitId: habit.id,
          completionDate: date,
          completedAt: currentTimestamp(),
        });
      } else {
        await completionsRepo.remove(habit.id, date);
      }
      await syncHabitReminders(habit, { completedToday }).catch(
        () => undefined,
      );
      setError("");
    } catch {
      setHabits((current) =>
        current.map((item) =>
          item.id === habit.id
            ? { ...item, completedToday: habit.completedToday }
            : item,
        ),
      );
      setError(t("saveCheckinError"));
    } finally {
      pending.current.delete(habit.id);
    }
  };

  const saveRichProgress = async (habit: TodayHabit, value: number, explicit: ProgressState = "active") => {
    if (pending.current.has(habit.id) || !Number.isFinite(value) || value < 0) return;
    pending.current.add(habit.id);
    const state = progressStateForValue(value, habit.targetValue, explicit);
    setHabits((current) => current.map((item) => item.id === habit.id ? {
      ...item, progressValue: value, progressState: state, completedToday: state === "completed",
    } : item));
    try {
      await progressRepo.save({ id: localIdentifier(), habitId: habit.id, localDate: date, value, state, recordedAt: currentTimestamp(), note: null }, habit.targetValue);
      selectionHaptic();
      setError("");
    } catch {
      await load();
      setError(t("saveCheckinError"));
    } finally { pending.current.delete(habit.id); }
  };

  const setRichState = async (habit: TodayHabit, state: Extract<ProgressState, "failed" | "skipped">) => {
    if (pending.current.has(habit.id)) return;
    pending.current.add(habit.id);
    setHabits((current) => current.map((item) => item.id === habit.id ? { ...item, progressState: state, completedToday: false } : item));
    try {
      await progressRepo.setState(habit.id, date, state, localIdentifier(), currentTimestamp());
      selectionHaptic();
      setError("");
    } catch { await load(); setError(t("saveCheckinError")); }
    finally { pending.current.delete(habit.id); }
  };

  const undoRichProgress = async (habit: TodayHabit) => {
    if (pending.current.has(habit.id)) return;
    pending.current.add(habit.id);
    setHabits((current) => current.map((item) => item.id === habit.id ? { ...item, progressValue: 0, progressState: null, completedToday: false } : item));
    try { await progressRepo.remove(habit.id, date); selectionHaptic(); setError(""); }
    catch { await load(); setError(t("saveCheckinError")); }
    finally { pending.current.delete(habit.id); }
  };

  return (
    <Screen>
      <ScreenHeader title={t("today")} subtitle={dateHeading(now, language)} />
      <View style={{ gap: 10 }}>
        <Label style={styles.heading}>{greeting(now, language)}</Label>
        <Label secondary style={{ lineHeight: 25 }}>
          {t("smallActions")}
        </Label>
      </View>
      {loading ? (
        <Label secondary>{t("loadingToday")}</Label>
      ) : error && habits.length === 0 ? (
        <View style={{ gap: 16 }}>
          <Label accessibilityRole="alert">{error}</Label>
          <ActionButton
            title={t("tryAgain")}
            onPress={() => setRetry((value) => value + 1)}
          />
        </View>
      ) : habits.length === 0 ? (
        <View style={{ gap: 10 }}>
          <Label style={styles.heading}>{t("nothingToday")}</Label>
          <Label secondary>{t("clearDay")}</Label>
        </View>
      ) : (
        <>
          <View
            style={{
              backgroundColor: colors.successSoft,
              borderRadius: 24,
              padding: 24,
              gap: 20,
            }}
          >
            <View style={styles.between}>
              <View>
                <Label
                  style={{ fontSize: 42, fontWeight: "600", letterSpacing: -1 }}
                >
                  {completedCount}
                  <Label secondary style={{ fontSize: 24 }}>
                    {" "}/ {habits.length}
                  </Label>
                </Label>
                <Label secondary style={styles.caption}>
                  {t("habitsCompleted")}
                </Label>
              </View>
              <Label style={{ color: colors.success, fontWeight: "600" }}>
                {percentage}%
              </Label>
            </View>
            <ProgressBar percentage={percentage} />
            <Label
              accessibilityLiveRegion="polite"
              style={{ color: colors.success, fontSize: 15 }}
            >
              {completedCount === habits.length
                ? t("perfectDay")
                : completedCount === 0
                  ? t("freshStart")
                  : t("makingSpace")}
            </Label>
          </View>
          {error ? <Label accessibilityRole="alert">{error}</Label> : null}
          <View>
            <Label style={styles.heading}>{t("dailyRhythm")}</Label>
            {habitGroups.map(([groupName, groupHabits]) => <View key={groupName || "ungrouped"} style={{ gap: 2 }}>
              {groupName ? <Label secondary style={[styles.caption, { paddingTop: 14 }]}>{groupName}</Label> : null}
              {groupHabits.map((habit) => habit.type === "check" ? (
                <HabitRow key={habit.id} habit={habit} completed={habit.completedToday} onToggle={() => void toggle(habit)} />
              ) : (
                <RichTodayRow key={habit.id} habit={habit} onSave={saveRichProgress} onState={setRichState} onUndo={undoRichProgress} />
              ))}
            </View>)}
          </View>
          <Label secondary style={[styles.caption, { textAlign: "center" }]}>
            {t("toggleCheckin")}
          </Label>
        </>
      )}
    </Screen>
  );
}

function RichTodayRow({ habit, onSave, onState, onUndo }: {
  habit: TodayHabit;
  onSave: (habit: TodayHabit, value: number, state?: ProgressState) => Promise<void>;
  onState: (habit: TodayHabit, state: Extract<ProgressState, "failed" | "skipped">) => Promise<void>;
  onUndo: (habit: TodayHabit) => Promise<void>;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [input, setInput] = useState(String(habit.progressValue));
  const step = habit.type === "count" ? 1 : Math.max(habit.targetValue / 4, habit.type === "duration" ? 60 : 0.1);
  const terminal = habit.progressState === "failed" || habit.progressState === "skipped";
  const update = (value: number) => { setInput(String(value)); void onSave(habit, value); };
  return <View style={{ paddingVertical: 16, gap: 10, borderBottomWidth: 1, borderColor: colors.border }}>
    <View style={styles.between}>
      <View style={{ flex: 1, gap: 3 }}><Label style={{ fontWeight: "600" }}>{habit.name}</Label><Label secondary style={styles.caption}>{terminal ? habit.progressState === "skipped" ? "Skipped" : "Failed" : `${habit.progressValue} / ${habit.targetValue}${habit.unit ? ` ${habit.unit}` : ""}`}</Label></View>
      <View style={[styles.row, { gap: 8 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${habit.name} decrease progress`} onPress={() => update(Math.max(0, habit.progressValue - step))} style={{ minWidth: 44, minHeight: 44, borderRadius: 12, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}><Label>−</Label></Pressable>
        <TextInput accessibilityLabel={`${habit.name} progress`} value={input} onChangeText={setInput} onSubmitEditing={() => { const value = Number(input.replace(",", ".")); if (Number.isFinite(value) && value >= 0) void onSave(habit, value); }} keyboardType="decimal-pad" selectTextOnFocus style={{ width: 64, minHeight: 44, textAlign: "center", color: colors.textPrimary, backgroundColor: colors.surface, borderRadius: 12 }} />
        <Pressable accessibilityRole="button" accessibilityLabel={`${habit.name} increase progress`} onPress={() => update(habit.progressValue + step)} style={{ minWidth: 44, minHeight: 44, borderRadius: 12, backgroundColor: colors.successSoft, alignItems: "center", justifyContent: "center" }}><Label>+</Label></Pressable>
      </View>
    </View>
    <View style={[styles.row, { gap: 8 }]}>
      {terminal ? <Pressable accessibilityRole="button" accessibilityLabel={`${habit.name} undo progress`} onPress={() => void onUndo(habit)}><Label secondary style={styles.caption}>Undo</Label></Pressable> : <>
        <Pressable accessibilityRole="button" accessibilityLabel={`${habit.name} skip`} onPress={() => void onState(habit, "skipped")}><Label secondary style={styles.caption}>Skip</Label></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`${habit.name} fail`} onPress={() => void onState(habit, "failed")}><Label secondary style={styles.caption}>Fail</Label></Pressable>
      </>}
      {habit.progressState === "completed" ? <Label style={[styles.caption, { color: colors.success }]}>{t("doneToday")}</Label> : null}
    </View>
  </View>;
}
