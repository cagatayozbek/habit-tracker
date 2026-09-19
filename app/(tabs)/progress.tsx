import { useCallback, useMemo, useState } from "react";
import { Platform, Pressable, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Screen, Label, styles } from "../../components/ui";
import { ScreenHeader } from "../../components/ScreenHeader";
import { Heatmap } from "../../components/Heatmap";
import { ProgressBar } from "../../components/ProgressBar";
import { ActionButton } from "../../components/ActionButton";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useHabitRepository } from "../../hooks/useHabitRepository";
import { useCompletionRepository } from "../../hooks/useCompletionRepository";
import { useProgressRepository } from "../../hooks/useProgressRepository";
import { useLocalToday } from "../../hooks/useLocalToday";
import { calculateProgress, type ProgressSummary } from "../../lib/progress";
import { localDateKey } from "../../lib/dates";
import { useTheme } from "../../theme/ThemeProvider";
import { useTranslation } from "../../lib/i18n";
import { buildReview, type WeeklyRecap, type HabitReview } from "../../lib/review";
import { updateHeatmapWidget } from "../../features/widgets/widget.bridge";

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
  const [showAllHabits, setShowAllHabits] = useState(false);
  const date = localDateKey(now);

  const load = useCallback(async () => {
    try {
      const habits = await habitsRepo.list();
      const entries = await Promise.all(
        habits.map(async (h) => [h.id, (await completionsRepo.list(h.id)).map((e) => e.completionDate)] as const)
      );
      const versions = await Promise.all(
        habits.map(async (h) => [h.id, await habitsRepo.scheduleVersions(h.id)] as const)
      );
      const calculated = calculateProgress(habits, new Map(entries), date, new Map(versions));
      setSummary(calculated);
      if (Platform.OS === "ios") {
        void updateHeatmapWidget(calculated.heatmap.map((d) => d.level), calculated.month.percentage);
      }
      const richEntries = await Promise.all(
        habits.map(async (h) => [h.id, await progressRepo.list(h.id)] as const)
      );
      setReview(buildReview(habits, new Map(richEntries), new Map(versions), date));
      setError("");
    } catch { setError(t("loadProgressError")); }
  }, [completionsRepo, date, habitsRepo, progressRepo, t]);

  useFocusEffect(useCallback(() => { void retry; void load(); }, [load, retry]));

  // Top/bottom habit for highlight
  const topHabit = useMemo(() =>
    summary?.habits.length
      ? [...summary.habits].sort((a, b) => b.percentage - a.percentage)[0]
      : null,
    [summary]
  );
  const worstHabit = useMemo(() =>
    summary?.habits.length
      ? [...summary.habits].sort((a, b) => a.percentage - b.percentage)[0]
      : null,
    [summary]
  );
  const showHabitHighlights = topHabit && worstHabit && topHabit.habit.id !== worstHabit.habit.id;

  const content = useMemo(() => summary && (
    <View style={{ gap: 28 }}>

      {/* ── 1. Big week number ── */}
      <View style={{ gap: 6 }}>
        <Label secondary style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>
          {t("thisWeek")}
        </Label>
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4 }}>
          <Label style={{ fontSize: 72, fontWeight: "700", letterSpacing: -3, color: colors.success, lineHeight: 76 }}>
            {summary.week.percentage}
          </Label>
          <Label style={{ fontSize: 32, fontWeight: "400", color: colors.success, marginBottom: 8 }}>%</Label>
        </View>
        <Label secondary style={{ fontSize: 14 }}>
          {summary.week.completed} / {summary.week.expected} alışkanlık · hafta
        </Label>
      </View>

      {/* ── 2. Compact streak strip ── */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        {[
          { icon: "flame" as const, value: `${summary.currentStreak}`, label: t("currentStreak"), glow: summary.currentStreak > 0 },
          { icon: "trophy" as const, value: `${summary.bestStreak}`, label: t("bestStreak"), glow: false },
          { icon: "calendar" as const, value: `${summary.month.percentage}%`, label: t("thisMonth"), glow: false },
        ].map(({ icon, value, label, glow }) => (
          <View
            key={label}
            style={{
              flex: 1,
              backgroundColor: glow ? colors.successSoft : colors.surface,
              borderRadius: 16,
              padding: 12,
              gap: 6,
              borderWidth: 1,
              borderColor: glow ? `${colors.success}50` : colors.border,
              alignItems: "center",
            }}
          >
            <Ionicons name={icon} size={18} color={glow ? colors.success : colors.textSecondary} />
            <Label style={{ fontSize: 20, fontWeight: "700", color: glow ? colors.success : colors.textPrimary }}>{value}</Label>
            <Label secondary style={{ fontSize: 10, textAlign: "center" }}>{label}</Label>
          </View>
        ))}
      </View>

      {/* ── 3. Heatmap ── */}
      <View style={{ gap: 12 }}>
        <Label style={{ fontSize: 17, fontWeight: "600", letterSpacing: -0.4 }}>Tutarlılık</Label>
        <Heatmap days={summary.heatmap} />
      </View>

      {/* ── 4. Highlights (best & worst — no duplication) ── */}
      {showHabitHighlights && (
        <View style={{ gap: 12 }}>
          <Label style={{ fontSize: 17, fontWeight: "600", letterSpacing: -0.4 }}>Öne Çıkanlar</Label>
          <View style={{ gap: 8 }}>
            {/* Best */}
            <View
              style={{
                backgroundColor: colors.successSoft,
                borderRadius: 16,
                padding: 14,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                borderWidth: 1,
                borderColor: `${colors.success}30`,
              }}
            >
              <Ionicons name="trending-up" size={20} color={colors.success} />
              <View style={{ flex: 1, gap: 4 }}>
                <Label style={{ fontWeight: "600", fontSize: 14 }}>{topHabit!.habit.name}</Label>
                <Label secondary style={{ fontSize: 12 }}>En tutarlı · {topHabit!.percentage}%</Label>
              </View>
              <Label style={{ fontWeight: "700", color: colors.success }}>{topHabit!.percentage}%</Label>
            </View>

            {/* Worst */}
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 16,
                padding: 14,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Ionicons name="trending-down" size={20} color="#FF6B6B" />
              <View style={{ flex: 1, gap: 4 }}>
                <Label style={{ fontWeight: "600", fontSize: 14 }}>{worstHabit!.habit.name}</Label>
                <Label secondary style={{ fontSize: 12 }}>Dikkat gerektiriyor · {worstHabit!.percentage}%</Label>
              </View>
              <Label style={{ fontWeight: "700", color: "#FF6B6B" }}>{worstHabit!.percentage}%</Label>
            </View>
          </View>
        </View>
      )}

      {/* ── 5. All habits (collapsible) ── */}
      {summary.habits.length > 0 && (
        <View style={{ gap: 12 }}>
          <View style={[styles.between]}>
            <Label style={{ fontSize: 17, fontWeight: "600", letterSpacing: -0.4 }}>Tüm Alışkanlıklar</Label>
            {summary.habits.length > 3 && (
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowAllHabits((v) => !v)}
                style={{ padding: 4 }}
              >
                <Label secondary style={{ fontSize: 13 }}>
                  {showAllHabits ? "Gizle" : `Tümü (${summary.habits.length})`}
                </Label>
              </Pressable>
            )}
          </View>
          <View style={{ gap: 12 }}>
            {(showAllHabits ? summary.habits : summary.habits.slice(0, 3)).map(({ habit, percentage }) => (
              <View key={habit.id} style={{ gap: 7 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Label style={{ fontWeight: "500", fontSize: 14 }}>{habit.name}</Label>
                  <Label secondary style={{ fontSize: 13 }}>{percentage}%</Label>
                </View>
                <ProgressBar percentage={percentage} />
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ── 6. Weekly recap (only non-duplicate info) ── */}
      {review && (review.recap.change !== 0 || review.recap.mostConsistent || review.recap.mostMissed) && (
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 18,
            padding: 16,
            gap: 10,
            borderWidth: 1,
            borderColor: colors.border,
            borderLeftWidth: 3,
            borderLeftColor: colors.success,
          }}
        >
          <Label style={{ fontSize: 15, fontWeight: "700" }}>Haftalık Özet</Label>
          {review.recap.change !== 0 && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons
                name={review.recap.change > 0 ? "arrow-up-circle" : "arrow-down-circle"}
                size={16}
                color={review.recap.change > 0 ? colors.success : "#FF6B6B"}
              />
              <Label secondary style={{ fontSize: 13 }}>
                Geçen haftaya göre {review.recap.change > 0 ? "+" : ""}{review.recap.change}% {review.recap.change > 0 ? "daha iyi" : "daha düşük"}
              </Label>
            </View>
          )}
          {review.recap.mostConsistent && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="flame" size={16} color={colors.success} />
              <Label secondary style={{ fontSize: 13 }}>
                En tutarlı: <Label style={{ fontWeight: "600", color: colors.textPrimary }}>{review.recap.mostConsistent}</Label>
              </Label>
            </View>
          )}
          {review.recap.mostMissed && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="alert-circle" size={16} color="#FF6B6B" />
              <Label secondary style={{ fontSize: 13 }}>
                Dikkat: <Label style={{ fontWeight: "600", color: colors.textPrimary }}>{review.recap.mostMissed}</Label>
              </Label>
            </View>
          )}
        </View>
      )}

    </View>
  ), [colors, review, showAllHabits, showHabitHighlights, summary, t, topHabit, worstHabit]);

  return (
    <Screen>
      <ScreenHeader title={t("progress")} subtitle={t("littleThings")} />
      {error ? (
        <View style={{ gap: 16 }}>
          <Label accessibilityRole="alert">{error}</Label>
          <ActionButton title={t("tryAgain")} onPress={() => setRetry((v) => v + 1)} />
        </View>
      ) : content ?? <Label secondary>{t("loadingProgress")}</Label>}
    </Screen>
  );
}
