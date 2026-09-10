import { useCallback, useMemo, useRef, useState } from "react";
import { Platform, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Screen, Label, styles } from "../../components/ui";
import { ScreenHeader } from "../../components/ScreenHeader";
import { HabitRow } from "../../components/HabitRow";
import { ProgressBar } from "../../components/ProgressBar";
import { ActionButton } from "../../components/ActionButton";
import type { TodayHabit } from "../../features/habits/habit.types";
import { useCompletionRepository } from "../../hooks/useCompletionRepository";
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
            {habits.map((habit) => (
              <HabitRow
                key={habit.id}
                habit={{
                  ...habit,
                  subtitle:
                    habit.type === "check"
                      ? undefined
                      : `${habit.progressValue} / ${habit.targetValue}${habit.unit ? ` ${habit.unit}` : ""}`,
                }}
                completed={habit.completedToday}
                onToggle={habit.type === "check" ? () => void toggle(habit) : undefined}
              />
            ))}
          </View>
          <Label secondary style={[styles.caption, { textAlign: "center" }]}>
            {t("toggleCheckin")}
          </Label>
        </>
      )}
    </Screen>
  );
}
