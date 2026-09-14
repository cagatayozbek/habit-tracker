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
import { useProgressRepository } from "../../hooks/useProgressRepository";
import { useLocalToday } from "../../hooks/useLocalToday";
import { calculateProgress, type ProgressSummary } from "../../lib/progress";
import { localDateKey } from "../../lib/dates";
import { useTheme } from "../../theme/ThemeProvider";
import { useTranslation } from "../../lib/i18n";
import { buildReview, type WeeklyRecap, type HabitReview } from "../../lib/review";
import ConsistencyHeatmapWidget from "../../widgets/ConsistencyHeatmapWidget";
export default function Progress() {
  const { t } = useTranslation();
  if (Platform.OS === "web")
    return <Screen><ScreenHeader title={t("progress")} subtitle={t("littleThings")} /><Label>{t("openIosProgress")}</Label></Screen>;
  return <SavedProgress />;
}
function SavedProgress() {
  const habitsRepo = useHabitRepository();
  const completionsRepo = useCompletionRepository();
  const progressRepo = useProgressRepository();
  const now = useLocalToday();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [error, setError] = useState("");
  const [review, setReview] = useState<{ habits: HabitReview[]; recap: WeeklyRecap } | null>(null);
  const [retry, setRetry] = useState(0);
  const date = localDateKey(now);
  const load = useCallback(async () => {
    try {
      const habits = await habitsRepo.list();
      const entries = await Promise.all(habits.map(async (habit) => [habit.id, (await completionsRepo.list(habit.id)).map((item) => item.completionDate)] as const));
      const versions = await Promise.all(habits.map(async (habit) => [habit.id, await habitsRepo.scheduleVersions(habit.id)] as const));
      const calculated = calculateProgress(habits, new Map(entries), date, new Map(versions));
      setSummary(calculated);
      if (Platform.OS === "ios") {
        ConsistencyHeatmapWidget.updateSnapshot({ levels: calculated.heatmap.map((day) => day.level), percentage: calculated.month.percentage });
      }
      const richEntries = await Promise.all(habits.map(async (habit) => [habit.id, await progressRepo.list(habit.id)] as const));
      setReview(buildReview(habits, new Map(richEntries), new Map(versions), date));
      setError("");
    } catch { setError(t("loadProgressError")); }
  }, [completionsRepo, date, habitsRepo, progressRepo, t]);
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
      {review ? <View style={{ gap: 14 }}>
        <Label style={styles.heading}>Weekly recap</Label>
        <Label secondary>{review.recap.percentage}% this week ({review.recap.change >= 0 ? "+" : ""}{review.recap.change}% vs last week)</Label>
        <Label secondary>{review.recap.achieved} of {review.recap.total} goals achieved{review.recap.mostConsistent ? ` · Most consistent: ${review.recap.mostConsistent}` : ""}</Label>
        {review.recap.mostMissed ? <Label secondary>Needs attention: {review.recap.mostMissed}</Label> : null}
      </View> : null}
      {review ? <View style={{ gap: 14 }}>
        <Label style={styles.heading}>Goal progress & totals</Label>
        {review.habits.map((item) => <View key={item.habit.id} style={{ gap: 6 }}>
          <View style={styles.between}><Label>{item.habit.name}</Label><Label secondary>{item.percentage}% · {item.value}/{item.habit.targetValue}{item.habit.unit ? ` ${item.habit.unit}` : ""}</Label></View>
          <ProgressBar percentage={item.percentage} />
          <Label secondary style={styles.caption}>Total: {item.total} · {item.completedPeriods} completed entries · {item.state}</Label>
        </View>)}
      </View> : null}
  </>, [colors.border, review, summary, t]);
  return <Screen><ScreenHeader title={t("progress")} subtitle={t("littleThings")} />{error ? <View style={{ gap: 16 }}><Label accessibilityRole="alert">{error}</Label><ActionButton title={t("tryAgain")} onPress={() => setRetry((value) => value + 1)} /></View> : content ?? <Label secondary>{t("loadingProgress")}</Label>}</Screen>;
}
