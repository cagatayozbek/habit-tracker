import { useCallback, useMemo, useState } from "react";
import { Platform, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Screen, Label, styles } from "../../components/ui";
import { ScreenHeader } from "../../components/ScreenHeader";
import { Heatmap } from "../../components/Heatmap";
import { ProgressBar } from "../../components/ProgressBar";
import { ActionButton } from "../../components/ActionButton";
import { useHabitRepository } from "../../hooks/useHabitRepository";
import { useCompletionRepository } from "../../hooks/useCompletionRepository";
import { useLocalToday } from "../../hooks/useLocalToday";
import { calculateProgress, type ProgressSummary } from "../../lib/progress";
import { localDateKey } from "../../lib/dates";
import { useTheme } from "../../theme/ThemeProvider";
import { useTranslation } from "../../lib/i18n";
export default function Progress() {
  const { t } = useTranslation();
  if (Platform.OS === "web")
    return <Screen><ScreenHeader title={t("progress")} subtitle={t("littleThings")} /><Label>{t("openIosProgress")}</Label></Screen>;
  return <SavedProgress />;
}
function SavedProgress() {
  const habitsRepo = useHabitRepository();
  const completionsRepo = useCompletionRepository();
  const now = useLocalToday();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const date = localDateKey(now);
  const load = useCallback(async () => {
    try {
      const habits = await habitsRepo.list();
      const entries = await Promise.all(habits.map(async (habit) => [habit.id, (await completionsRepo.list(habit.id)).map((item) => item.completionDate)] as const));
      const versions = await Promise.all(habits.map(async (habit) => [habit.id, await habitsRepo.scheduleVersions(habit.id)] as const));
      setSummary(calculateProgress(habits, new Map(entries), date, new Map(versions)));
      setError("");
    } catch { setError(t("loadProgressError")); }
  }, [completionsRepo, date, habitsRepo, t]);
  useFocusEffect(useCallback(() => { void retry; void load(); }, [load, retry]));
  const content = useMemo(() => summary && <>
      <View style={{ gap: 8 }}>
        <Label secondary style={styles.caption}>
          {t("thisWeek")}
        </Label>
        <Label style={{ fontSize: 64, fontWeight: "600", letterSpacing: -3 }}>
          {summary.week.percentage}<Label style={{ fontSize: 32 }}>%</Label>
        </Label>
        <Label secondary>{summary.week.completed} {t("ofCompleted")} {summary.week.expected} {t("habitsCompleted")}</Label>
      </View>
      <View style={{ gap: 20 }}>
        <Label style={styles.heading}>{t("often")}</Label>
        <Heatmap days={summary.heatmap} />
      </View>
      <View
        style={[
          styles.between,
          {
            paddingVertical: 24,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: colors.border,
          },
        ]}
      >
        {[
          [`${summary.currentStreak} ${t("days")}`, t("currentStreak")],
          [`${summary.bestStreak} ${t("days")}`, t("bestStreak")],
          [`${summary.month.percentage}%`, t("thisMonth")],
        ].map(([value, label]) => (
          <View key={label} style={{ flex: 1, gap: 6 }}>
            <Label style={{ fontSize: 22, fontWeight: "600" }}>{value}</Label>
            <Label secondary style={styles.caption}>
              {label}
            </Label>
          </View>
        ))}
      </View>
      <View style={{ gap: 22 }}>
        <Label style={styles.heading}>{t("habitByHabit")}</Label>
        {summary.habits.length === 0 ? <Label secondary>{t("addForProgress")}</Label> : summary.habits.map(({ habit, percentage }) => (
          <View key={habit.id} style={{ gap: 10 }}>
            <View style={styles.between}>
              <Label>{habit.name}</Label>
              <Label secondary>{percentage}%</Label>
            </View>
            <ProgressBar percentage={percentage} />
          </View>
        ))}
      </View>
  </>, [colors.border, summary, t]);
  return <Screen><ScreenHeader title={t("progress")} subtitle={t("littleThings")} />{error ? <View style={{ gap: 16 }}><Label accessibilityRole="alert">{error}</Label><ActionButton title={t("tryAgain")} onPress={() => setRetry((value) => value + 1)} /></View> : content ?? <Label secondary>{t("loadingProgress")}</Label>}</Screen>;
}
