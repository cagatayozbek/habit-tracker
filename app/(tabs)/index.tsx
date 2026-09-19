import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Platform, Pressable, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Screen, Label, styles } from "../../components/ui";
import { ScreenHeader } from "../../components/ScreenHeader";
import { HabitRow } from "../../components/HabitRow";
import { ProgressBar } from "../../components/ProgressBar";
import { ActionButton } from "../../components/ActionButton";
import Ionicons from "@expo/vector-icons/Ionicons";
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
import { cancelTimerReminder, syncHabitReminders, syncTimerReminder } from "../../features/notifications/notification.service";
import { useTranslation } from "../../lib/i18n";
import { selectionHaptic } from "../../lib/haptics";
import { progressStateForValue } from "../../lib/goals";
import type { ProgressState } from "../../features/completions/completion.types";
import { notifyWatchDataChanged } from "../../components/WatchConnectivityProvider";
import { useTimerService } from "../../hooks/useTimerService";
import type { HabitTimer } from "../../features/timer/timer.service";
import { updateTodayWidgets } from "../../features/widgets/widget.bridge";

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
  const timerService = useTimerService();
  const { colors } = useTheme();
  const { t, language } = useTranslation();
  const date = localDateKey(now);
  const weekday = localWeekday(now);
  const [habits, setHabits] = useState<TodayHabit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [timer, setTimer] = useState<HabitTimer | null>(null);
  const [, setTimerTick] = useState(0);
  const pending = useRef(new Set<string>());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [scheduled, savedTimer] = await Promise.all([
        habitsRepo.listScheduledForDate(date, weekday),
        timerService.get(),
      ]);
      setHabits(scheduled);
      setTimer(savedTimer);
      if (Platform.OS === "ios") {
        const completed = scheduled.filter((habit) => habit.completedToday).length;
        void updateTodayWidgets(scheduled, completionPercentage(completed, scheduled.length));
      }
      setError("");
    } catch {
      setError(t("loadTodayError"));
    } finally {
      setLoading(false);
    }
  }, [date, habitsRepo, t, timerService, weekday]);

  useEffect(() => {
    if (!timer?.startedAt) return;
    const interval = setInterval(() => setTimerTick((v) => v + 1), 1000);
    return () => clearInterval(interval);
  }, [timer?.startedAt]);

  useFocusEffect(
    useCallback(() => {
      void retry;
      void load();
    }, [load, retry]),
  );

  const completedCount = useMemo(
    () => habits.filter((h) => h.completedToday).length,
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

  // Separate check from rich habits for UX clarity
  const checkCount = useMemo(() => habits.filter((h) => h.type === "check").length, [habits]);
  const richCount = useMemo(() => habits.filter((h) => h.type !== "check").length, [habits]);

  const toggle = async (habit: TodayHabit) => {
    if (pending.current.has(habit.id)) return;
    pending.current.add(habit.id);
    const completedToday = !habit.completedToday;
    setHabits((current) => current.map((item) => item.id === habit.id ? { ...item, completedToday } : item));
    try {
      if (completedToday) {
        await completionsRepo.add({ id: localIdentifier(), habitId: habit.id, completionDate: date, completedAt: currentTimestamp() });
      } else {
        await completionsRepo.remove(habit.id, date);
      }
      await syncHabitReminders(habit, { completedToday }).catch(() => undefined);
      notifyWatchDataChanged();
      setError("");
    } catch {
      setHabits((current) => current.map((item) => item.id === habit.id ? { ...item, completedToday: habit.completedToday } : item));
      setError(t("saveCheckinError"));
    } finally {
      pending.current.delete(habit.id);
    }
  };

  const saveRichProgress = async (habit: TodayHabit, value: number, explicit: ProgressState = "active") => {
    if (pending.current.has(habit.id) || !Number.isFinite(value) || value < 0) return;
    pending.current.add(habit.id);
    const state = progressStateForValue(value, habit.targetValue, explicit);
    setHabits((current) => current.map((item) => item.id === habit.id ? { ...item, progressValue: value, progressState: state, completedToday: state === "completed" } : item));
    try {
      await progressRepo.save({ id: localIdentifier(), habitId: habit.id, localDate: date, value, state, recordedAt: currentTimestamp(), note: null }, habit.targetValue);
      selectionHaptic();
      notifyWatchDataChanged();
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
      notifyWatchDataChanged();
      setError("");
    } catch { await load(); setError(t("saveCheckinError")); }
    finally { pending.current.delete(habit.id); }
  };

  const undoRichProgress = async (habit: TodayHabit) => {
    if (pending.current.has(habit.id)) return;
    pending.current.add(habit.id);
    setHabits((current) => current.map((item) => item.id === habit.id ? { ...item, progressValue: 0, progressState: null, completedToday: false } : item));
    try { await progressRepo.remove(habit.id, date); selectionHaptic(); notifyWatchDataChanged(); setError(""); }
    catch { await load(); setError(t("saveCheckinError")); }
    finally { pending.current.delete(habit.id); }
  };

  const startTimer = async (habit: TodayHabit) => {
    try {
      const started = await timerService.start(habit.id, currentTimestamp());
      setTimer(started);
      await syncTimerReminder(habit, started.accumulatedSeconds).catch(() => undefined);
      setError("");
    } catch { setError("Another duration timer is already running."); }
  };

  const pauseTimer = async () => {
    try {
      const paused = await timerService.pause(currentTimestamp());
      setTimer(paused);
      if (paused) await cancelTimerReminder(paused.habitId).catch(() => undefined);
      setError("");
    } catch { setError("The timer could not be paused."); }
  };

  const finishTimer = async (habit: TodayHabit) => {
    try {
      const stopped = await timerService.pause(currentTimestamp());
      if (!stopped || stopped.habitId !== habit.id) return;
      await saveRichProgress(habit, habit.progressValue + stopped.accumulatedSeconds);
      await timerService.clear();
      await cancelTimerReminder(habit.id).catch(() => undefined);
      setTimer(null);
    } catch { setError("The timer could not be saved."); }
  };

  return (
    <Screen>
      <ScreenHeader title={greeting(now, language)} subtitle={dateHeading(now, language)} />
      {loading ? (
        <Label secondary>{t("loadingToday")}</Label>
      ) : error && habits.length === 0 ? (
        <View style={{ gap: 16 }}>
          <Label accessibilityRole="alert">{error}</Label>
          <ActionButton title={t("tryAgain")} onPress={() => setRetry((v) => v + 1)} />
        </View>
      ) : habits.length === 0 ? (
        <View style={{ gap: 10, paddingTop: 8 }}>
          <Label style={[styles.heading, { color: colors.success }]}>{t("nothingToday")}</Label>
          <Label secondary>{t("clearDay")}</Label>
        </View>
      ) : (
        <>
          {/* ── Progress summary card ── */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 24,
              padding: 20,
              gap: 14,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View style={styles.between}>
              <View style={{ gap: 2 }}>
                <Label
                  style={{
                    fontSize: 48,
                    fontWeight: "700",
                    letterSpacing: -2,
                    color: colors.success,
                    lineHeight: 52,
                  }}
                >
                  {completedCount}
                  <Label secondary style={{ fontSize: 26, fontWeight: "400", letterSpacing: -0.5 }}>
                    /{habits.length}
                  </Label>
                </Label>
                <Label secondary style={styles.caption}>{t("habitsCompleted")}</Label>
              </View>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: colors.successSoft,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: `${colors.success}40`,
                }}
              >
                <Label style={{ fontSize: 14, fontWeight: "700", color: colors.success }}>
                  {percentage}%
                </Label>
              </View>
            </View>
            <ProgressBar percentage={percentage} />
            <Label
              accessibilityLiveRegion="polite"
              style={{ color: colors.success, fontSize: 13, fontWeight: "500" }}
            >
              {completedCount === habits.length
                ? t("perfectDay")
                : completedCount === 0
                  ? t("freshStart")
                  : t("makingSpace")}
            </Label>
          </View>

          {error ? <Label accessibilityRole="alert">{error}</Label> : null}

          {/* ── Habit groups ── */}
          <View style={{ gap: 24 }}>
            {habitGroups.map(([groupName, groupHabits]) => {
              const groupCheck = groupHabits.filter((h) => h.type === "check");
              const groupRich = groupHabits.filter((h) => h.type !== "check");
              return (
                <View key={groupName || "ungrouped"} style={{ gap: 10 }}>
                  {groupName ? (
                    <Label secondary style={[styles.caption, { textTransform: "uppercase", letterSpacing: 0.8 }]}>
                      {groupName}
                    </Label>
                  ) : null}

                  {/* Check habits — tap-to-toggle cards */}
                  {groupCheck.length > 0 && (
                    <View style={{ gap: 8 }}>
                      {checkCount > 0 && richCount > 0 && !groupName ? (
                        <Label secondary style={[styles.caption, { textTransform: "uppercase", letterSpacing: 0.8 }]}>
                          {t("habits")}
                        </Label>
                      ) : null}
                      {groupCheck.map((habit) => (
                        <HabitRow
                          key={habit.id}
                          habit={habit}
                          completed={habit.completedToday}
                          onToggle={() => void toggle(habit)}
                        />
                      ))}
                    </View>
                  )}

                  {/* Rich habits — measurable section */}
                  {groupRich.length > 0 && (
                    <View style={{ gap: 8 }}>
                      {checkCount > 0 && richCount > 0 && !groupName ? (
                        <Label secondary style={[styles.caption, { textTransform: "uppercase", letterSpacing: 0.8 }]}>
                          Tracked
                        </Label>
                      ) : null}
                      {groupRich.map((habit) => (
                        <RichTodayRow
                          key={habit.id}
                          habit={habit}
                          timer={timer}
                          onStartTimer={startTimer}
                          onPauseTimer={pauseTimer}
                          onFinishTimer={finishTimer}
                          onSave={saveRichProgress}
                          onState={setRichState}
                          onUndo={undoRichProgress}
                        />
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          <Label secondary style={[styles.caption, { textAlign: "center" }]}>
            {t("toggleCheckin")}
          </Label>
        </>
      )}
    </Screen>
  );
}

// ─────────────────────────────────────────────
// Timer helpers
// ─────────────────────────────────────────────
function timerSeconds(timer: HabitTimer): number {
  if (!timer.startedAt) return timer.accumulatedSeconds;
  return timer.accumulatedSeconds + Math.max(0, Math.round((Date.now() - Date.parse(timer.startedAt)) / 1000));
}

function formatTimer(seconds: number): string {
  const whole = Math.floor(seconds);
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = whole % 60;
  return `${h ? `${h}:` : ""}${String(m).padStart(h ? 2 : 1, "0")}:${String(s).padStart(2, "0")}`;
}

// ─────────────────────────────────────────────
// RichTodayRow — measurable habit card
// ─────────────────────────────────────────────
function RichTodayRow({
  habit, timer, onStartTimer, onPauseTimer, onFinishTimer, onSave, onState, onUndo,
}: {
  habit: TodayHabit;
  timer: HabitTimer | null;
  onStartTimer: (habit: TodayHabit) => Promise<void>;
  onPauseTimer: () => Promise<void>;
  onFinishTimer: (habit: TodayHabit) => Promise<void>;
  onSave: (habit: TodayHabit, value: number, state?: ProgressState) => Promise<void>;
  onState: (habit: TodayHabit, state: Extract<ProgressState, "failed" | "skipped">) => Promise<void>;
  onUndo: (habit: TodayHabit) => Promise<void>;
}) {
  const { colors, dark } = useTheme();
  const { t } = useTranslation();
  const [input, setInput] = useState(String(Math.round(habit.progressValue)));

  const step = habit.type === "count"
    ? 1
    : Math.max(habit.targetValue / 4, habit.type === "duration" ? 60 : 0.1);
  const terminal = habit.progressState === "failed" || habit.progressState === "skipped";
  const completed = habit.progressState === "completed";
  const thisTimer = timer?.habitId === habit.id ? timer : null;
  const timerRunning = Boolean(thisTimer?.startedAt);
  const timerUnavailable = Boolean(timer && !thisTimer);

  const update = (value: number) => {
    const rounded = Math.round(value);
    setInput(String(rounded));
    void onSave(habit, rounded);
  };

  // Pulse animation for running timer
  const [pulse] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (!timerRunning) { pulse.setValue(1); return; }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [timerRunning, pulse]);

  const cardBg = completed && dark ? colors.successSoft : colors.surface;
  const cardBorder = completed && dark ? `${colors.success}40` : colors.border;

  return (
    <View style={{ borderRadius: 18, backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder, overflow: "hidden" }}>
      <View style={{ padding: 16, gap: 14 }}>

        {/* ── Header row: name + stepper ── */}
        <View style={styles.between}>
          <View style={{ flex: 1, gap: 3 }}>
            <Label style={{ fontWeight: "700", fontSize: 16, color: completed ? colors.success : colors.textPrimary }}>
              {habit.name}
            </Label>
            <Label secondary style={styles.caption}>
              {terminal
                ? habit.progressState === "skipped" ? "⏭  Atlandı" : "✕  Başarısız"
                : completed
                  ? `✓  ${Math.round(habit.progressValue)}${habit.unit ? ` ${habit.unit}` : ""}`
                  : `${Math.round(habit.progressValue)} / ${habit.targetValue}${habit.unit ? ` ${habit.unit}` : ""}`}
            </Label>
          </View>

          {/* Stepper — hidden when terminal */}
          {!terminal && (
            <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${habit.name} azalt`}
                onPress={() => update(Math.max(0, habit.progressValue - step))}
                style={{
                  width: 38, height: 38, borderRadius: 12,
                  backgroundColor: colors.border,
                  alignItems: "center", justifyContent: "center",
                }}
              >
                <Label style={{ fontSize: 20, lineHeight: 22 }}>−</Label>
              </Pressable>
              <TextInput
                accessibilityLabel={`${habit.name} ilerleme`}
                value={input}
                onChangeText={setInput}
                onSubmitEditing={() => {
                  const v = Number(input.replace(",", "."));
                  if (Number.isFinite(v) && v >= 0) void onSave(habit, Math.round(v));
                }}
                keyboardType="decimal-pad"
                selectTextOnFocus
                style={{
                  width: 56, height: 38,
                  textAlign: "center",
                  color: colors.textPrimary,
                  backgroundColor: colors.border,
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: "700",
                }}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${habit.name} artır`}
                onPress={() => update(habit.progressValue + step)}
                style={{
                  width: 38, height: 38, borderRadius: 12,
                  backgroundColor: colors.successSoft,
                  alignItems: "center", justifyContent: "center",
                }}
              >
                <Label style={{ fontSize: 20, lineHeight: 22, color: colors.success }}>+</Label>
              </Pressable>
            </View>
          )}
        </View>

        {/* ── Timer row (duration only) ── */}
        {habit.type === "duration" && !terminal && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: timerRunning ? colors.successSoft : colors.border,
              borderRadius: 14,
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderWidth: timerRunning ? 1 : 0,
              borderColor: timerRunning ? `${colors.success}60` : "transparent",
            }}
          >
            {/* Timer display */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Animated.View style={{ transform: [{ scale: pulse }] }}>
                <Ionicons
                  name={timerRunning ? "radio-button-on" : "timer-outline"}
                  size={18}
                  color={timerRunning ? colors.success : colors.textSecondary}
                />
              </Animated.View>
              <Label
                accessibilityLiveRegion="polite"
                style={{
                  fontVariant: ["tabular-nums"],
                  fontWeight: "700",
                  fontSize: 20,
                  color: timerRunning ? colors.success : colors.textPrimary,
                  letterSpacing: -0.5,
                }}
              >
                {thisTimer ? formatTimer(timerSeconds(thisTimer)) : "0:00"}
              </Label>
            </View>

            {/* Timer controls */}
            <View style={{ flexDirection: "row", gap: 8 }}>
              {timerRunning ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void onPauseTimer()}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10,
                    backgroundColor: colors.border,
                  }}
                >
                  <Label style={{ fontSize: 14, fontWeight: "600" }}>Duraklat</Label>
                </Pressable>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  disabled={timerUnavailable}
                  onPress={() => void onStartTimer(habit)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10,
                    backgroundColor: timerUnavailable ? colors.border : colors.successSoft,
                    opacity: timerUnavailable ? 0.5 : 1,
                  }}
                >
                  <Label style={{ fontSize: 14, fontWeight: "600", color: timerUnavailable ? colors.textSecondary : colors.success }}>
                    {thisTimer ? "Devam" : "Başlat"}
                  </Label>
                </Pressable>
              )}
              {thisTimer && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void onFinishTimer(habit)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10,
                    backgroundColor: colors.success,
                  }}
                >
                  <Label style={{ fontSize: 14, fontWeight: "700", color: colors.onAccent }}>Kaydet</Label>
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* ── Action row: Skip / Fail / Undo / Done ── */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {terminal ? (
            <>
              <Label secondary style={[styles.caption, { flex: 1 }]}>
                {habit.progressState === "skipped" ? "Bu alışkanlık atlandı" : "Bu alışkanlık başarısız"}
              </Label>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${habit.name} geri al`}
                onPress={() => void onUndo(habit)}
                style={{
                  paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10,
                  backgroundColor: colors.border,
                }}
              >
                <Label style={{ fontSize: 13, fontWeight: "600" }}>Geri Al</Label>
              </Pressable>
            </>
          ) : completed ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Label style={{ fontSize: 13, fontWeight: "600", color: colors.success }}>{t("doneToday")}</Label>
            </View>
          ) : (
            <>
              <Label secondary style={[styles.caption, { flex: 1 }]}>Bugün nasıl gitti?</Label>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${habit.name} atla`}
                onPress={() => void onState(habit, "skipped")}
                style={{
                  paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
                  backgroundColor: colors.border,
                }}
              >
                <Label style={{ fontSize: 13, color: colors.textSecondary }}>Atla</Label>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${habit.name} başarısız`}
                onPress={() => void onState(habit, "failed")}
                style={{
                  paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
                  backgroundColor: `#FF453A20`,
                }}
              >
                <Label style={{ fontSize: 13, color: "#FF6B6B" }}>Başarısız</Label>
              </Pressable>
            </>
          )}
        </View>

      </View>
    </View>
  );
}
