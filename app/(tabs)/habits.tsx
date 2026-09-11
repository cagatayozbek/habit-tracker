import { useCallback, useState } from "react";
import { Platform, Pressable, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Screen, Label, styles } from "../../components/ui";
import { ScreenHeader } from "../../components/ScreenHeader";
import { ActionButton } from "../../components/ActionButton";
import { useHabitRepository } from "../../hooks/useHabitRepository";
import type { Habit } from "../../features/habits/habit.types";
import { icons, scheduleLabel } from "../../features/habits/habit.options";
import { useTheme } from "../../theme/ThemeProvider";
import { useTranslation } from "../../lib/i18n";
export default function Habits() {
  const { t } = useTranslation();
  if (Platform.OS === "web")
    return (
      <Screen>
        <ScreenHeader title={t("habits")} subtitle={t("makeRoom")} />
        <Label>{t("openIosHabits")}</Label>
      </Screen>
    );
  return <SavedHabits />;
}
function SavedHabits() {
  const repo = useHabitRepository();
  const { colors } = useTheme();
  const { t, language } = useTranslation();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [archived, setArchived] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      // Changing the retry counter explicitly reruns this focused query.
      void retry;
      repo
        .list(true)
        .then((items) => {
          if (active) {
            setHabits(items);
            setError("");
            setLoading(false);
          }
        })
        .catch(() => {
          if (active) {
            setError(t("loadHabitsError"));
            setLoading(false);
          }
        });
      return () => {
        active = false;
      };
  }, [repo, retry, t]),
  );
  const visible = habits
    .filter((habit) => Boolean(habit.archivedAt) === archived)
    .sort((left, right) => left.sortOrder - right.sortOrder);
  const move = async (id: string, direction: -1 | 1) => {
    const index = visible.findIndex((habit) => habit.id === id);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= visible.length) return;
    const reordered = [...visible];
    [reordered[index], reordered[next]] = [reordered[next], reordered[index]];
    setHabits((current) => {
      const order = new Map(reordered.map((habit, position) => [habit.id, position + 1]));
      return current.map((habit) => order.has(habit.id) ? { ...habit, sortOrder: order.get(habit.id)! } : habit);
    });
    try { await repo.reorder(reordered.map((habit) => habit.id)); }
    catch { setError(t("saveError")); setRetry((value) => value + 1); }
  };
  return (
    <Screen>
      <ScreenHeader title={t("habits")} subtitle={t("makeRoom")} />
      <ActionButton
        title={t("addHabit")}
        onPress={() => router.push("/habit/new")}
      />
      <View style={styles.row}>
        {[false, true].map((value) => (
          <Pressable
            key={String(value)}
            accessibilityRole="button"
            accessibilityLabel={value ? t("showArchived") : t("showActive")}
            accessibilityState={{ selected: archived === value }}
            onPress={() => setArchived(value)}
            style={{
              padding: 12,
              minHeight: 44,
              borderBottomWidth: archived === value ? 2 : 0,
              borderColor: colors.success,
            }}
          >
            <Label>{value ? t("archived") : t("active")}</Label>
          </Pressable>
        ))}
      </View>
      {loading ? (
        <Label secondary>{t("loadingHabits")}</Label>
      ) : error ? (
        <>
          <Label>{error}</Label>
          <ActionButton
            title={t("tryAgain")}
            onPress={() => setRetry((value) => value + 1)}
          />
        </>
      ) : visible.length === 0 ? (
        <View style={{ gap: 12 }}>
          <Label style={styles.heading}>
            {archived ? t("noArchived") : t("startSmall")}
          </Label>
          <Label secondary>
            {archived
              ? t("archivedHere")
              : t("addHabitHint")}
          </Label>
        </View>
      ) : (
        <View>
          {visible.map((habit) => (
            <View
              key={habit.id}
              style={[
                styles.row,
                {
                  paddingVertical: 20,
                  borderBottomWidth: 1,
                  borderColor: colors.border,
                },
              ]}
            >
              <Pressable accessibilityRole="button" accessibilityLabel={`${t("editHabit")} ${habit.name}`} accessibilityHint={t("opensEditor")} onPress={() => router.push({ pathname: "/habit/[id]", params: { id: habit.id } })} style={[styles.row, { flex: 1 }]}>
                <Ionicons name={icons.find((icon) => icon === habit.icon) ?? "leaf-outline"} size={26} color={habit.color} />
                <View style={{ flex: 1, gap: 6 }}><Label style={{ fontWeight: "600" }}>{habit.name}</Label><Label secondary style={styles.caption}>{scheduleLabel(habit.frequencyType, habit.scheduledDays, language)}</Label></View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </Pressable>
              {!archived ? <View style={{ gap: 2 }}>
                <Pressable accessibilityRole="button" accessibilityLabel={`${habit.name} move up`} disabled={visible[0]?.id === habit.id} onPress={() => void move(habit.id, -1)} style={{ minWidth: 36, minHeight: 28, alignItems: "center", justifyContent: "center" }}><Ionicons name="chevron-up" size={18} color={colors.textSecondary} /></Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={`${habit.name} move down`} disabled={visible.at(-1)?.id === habit.id} onPress={() => void move(habit.id, 1)} style={{ minWidth: 36, minHeight: 28, alignItems: "center", justifyContent: "center" }}><Ionicons name="chevron-down" size={18} color={colors.textSecondary} /></Pressable>
              </View> : null}
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}
