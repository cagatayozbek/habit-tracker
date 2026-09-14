import { useCallback, useMemo, useState } from "react";
import { Alert, PanResponder, Platform, Pressable, TextInput, View } from "react-native";
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
import { currentTimestamp, localDateKey } from "../../lib/dates";
import { localIdentifier } from "../../lib/ids";
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
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<Habit["type"] | "all">("all");
  const [sort, setSort] = useState<"custom" | "name" | "newest">("custom");
  const [selected, setSelected] = useState<string[]>([]);
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
    .filter((habit) => typeFilter === "all" || habit.type === typeFilter)
    .filter((habit) => `${habit.name} ${habit.description ?? ""} ${habit.groupName ?? ""}`.toLocaleLowerCase(language).includes(query.trim().toLocaleLowerCase(language)))
    .sort((left, right) => sort === "name" ? left.name.localeCompare(right.name, language) : sort === "newest" ? right.createdAt.localeCompare(left.createdAt) : left.sortOrder - right.sortOrder);
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
  const moveBy = async (id: string, offset: number) => {
    const from = visible.findIndex((habit) => habit.id === id);
    const to = Math.max(0, Math.min(visible.length - 1, from + offset));
    if (from < 0 || from === to) return;
    const reordered = [...visible];
    const [item] = reordered.splice(from, 1);
    reordered.splice(to, 0, item);
    setHabits((current) => { const order = new Map(reordered.map((habit, index) => [habit.id, index + 1])); return current.map((habit) => order.has(habit.id) ? { ...habit, sortOrder: order.get(habit.id)! } : habit); });
    try { await repo.reorder(reordered.map((habit) => habit.id)); } catch { setError(t("saveError")); setRetry((value) => value + 1); }
  };
  const duplicate = async (habit: Habit) => {
    const now = currentTimestamp();
    const copy: Habit = { ...habit, id: localIdentifier(), name: `${habit.name} Copy`, createdAt: now, archivedAt: null, sortOrder: Date.now(), schedule: habit.schedule ? { ...habit.schedule, startDate: localDateKey(new Date()), endDate: null } : undefined };
    try { await repo.save(copy, habit.groupName ?? null); setRetry((value) => value + 1); }
    catch { setError(t("saveError")); }
  };
  const createTemplate = async (template: { name: string; icon: string; type: Habit["type"]; targetValue: number; unit: string | null }) => {
    const now = currentTimestamp();
    const startDate = localDateKey(new Date());
    const habit: Habit = { id: localIdentifier(), name: template.name, icon: template.icon, color: "#32694F", description: null, type: template.type, targetValue: template.targetValue, unit: template.unit, goalPeriod: "daily", groupId: null, sortOrder: habits.length + 1, schedule: { type: "daily", weekdays: [], daysOfMonth: [], intervalDays: null, occurrences: null, startDate, endDate: null }, frequencyType: "daily", scheduledDays: [], reminderEnabled: false, reminderTime: null, createdAt: now, archivedAt: null };
    try { await repo.save(habit); setRetry((value) => value + 1); }
    catch { setError(t("saveError")); }
  };
  const archiveSelected = () => Alert.alert("Archive habits?", `${selected.length} habits will move to Archived.`, [
    { text: t("cancel"), style: "cancel" },
    { text: t("archived"), style: "destructive", onPress: () => void repo.archiveMany(selected, currentTimestamp()).then(() => { setSelected([]); setRetry((value) => value + 1); }).catch(() => setError(t("saveError"))) },
  ]);
  return (
    <Screen>
      <ScreenHeader title={t("habits")} subtitle={t("makeRoom")} />
      <ActionButton
        title={t("addHabit")}
        onPress={() => router.push("/habit/new")}
      />
      <View style={{ gap: 8 }}><Label secondary style={styles.caption}>Quick templates</Label><View style={[styles.row, { flexWrap: "wrap", gap: 8 }]}>
        {[{ name: "Drink water", icon: "water-outline", type: "quantity" as const, targetValue: 8, unit: "glasses" }, { name: "Read", icon: "book-outline", type: "duration" as const, targetValue: 1200, unit: "seconds" }, { name: "Walk", icon: "walk-outline", type: "count" as const, targetValue: 8000, unit: "steps" }].map((template) => <Pressable key={template.name} accessibilityRole="button" accessibilityLabel={`Create ${template.name} habit`} onPress={() => void createTemplate(template)} style={{ padding: 10, borderRadius: 12, backgroundColor: colors.surface }}><Label>{template.name}</Label></Pressable>)}
      </View></View>
      <TextInput accessibilityLabel="Search habits" placeholder="Search habits, notes, or groups" placeholderTextColor={colors.textSecondary} value={query} onChangeText={setQuery} style={{ color: colors.textPrimary, backgroundColor: colors.surface, padding: 14, minHeight: 48, borderRadius: 14 }} />
      <View style={[styles.row, { flexWrap: "wrap", gap: 7 }]}>
        {(["all", "check", "count", "quantity", "duration"] as const).map((value) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: typeFilter === value }} onPress={() => setTypeFilter(value)} style={{ padding: 9, borderRadius: 10, backgroundColor: typeFilter === value ? colors.successSoft : colors.surface }}><Label style={styles.caption}>{value}</Label></Pressable>)}
      </View>
      <View style={[styles.row, { gap: 7 }]}>
        {(["custom", "name", "newest"] as const).map((value) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: sort === value }} onPress={() => setSort(value)} style={{ padding: 9, borderBottomWidth: sort === value ? 2 : 0, borderColor: colors.success }}><Label secondary style={styles.caption}>{value}</Label></Pressable>)}
      </View>
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
              {!archived ? <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: selected.includes(habit.id) }} accessibilityLabel={`Select ${habit.name}`} onPress={() => setSelected((current) => current.includes(habit.id) ? current.filter((id) => id !== habit.id) : [...current, habit.id])} style={{ minWidth: 32, minHeight: 44, justifyContent: "center" }}><Ionicons name={selected.includes(habit.id) ? "checkbox" : "square-outline"} size={23} color={colors.success} /></Pressable> : null}
              <Pressable accessibilityRole="button" accessibilityLabel={`${t("editHabit")} ${habit.name}`} accessibilityHint={t("opensEditor")} onPress={() => router.push({ pathname: "/habit/[id]", params: { id: habit.id } })} style={[styles.row, { flex: 1 }]}>
                <Ionicons name={icons.find((icon) => icon === habit.icon) ?? "leaf-outline"} size={26} color={habit.color} />
                <View style={{ flex: 1, gap: 6 }}><Label style={{ fontWeight: "600" }}>{habit.name}</Label><Label secondary style={styles.caption}>{scheduleLabel(habit.frequencyType, habit.scheduledDays, language)}</Label></View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </Pressable>
              {!archived ? <Pressable accessibilityRole="button" accessibilityLabel={`Duplicate ${habit.name}`} onPress={() => void duplicate(habit)} style={{ minWidth: 36, minHeight: 44, justifyContent: "center" }}><Ionicons name="copy-outline" size={19} color={colors.textSecondary} /></Pressable> : null}
              {!archived ? <View style={{ gap: 2 }}>
                {sort === "custom" ? <ReorderHandle name={habit.name} onDrop={(offset) => void moveBy(habit.id, offset)} /> : null}
                <Pressable accessibilityRole="button" accessibilityLabel={`${habit.name} move up`} disabled={visible[0]?.id === habit.id} onPress={() => void move(habit.id, -1)} style={{ minWidth: 36, minHeight: 28, alignItems: "center", justifyContent: "center" }}><Ionicons name="chevron-up" size={18} color={colors.textSecondary} /></Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={`${habit.name} move down`} disabled={visible.at(-1)?.id === habit.id} onPress={() => void move(habit.id, 1)} style={{ minWidth: 36, minHeight: 28, alignItems: "center", justifyContent: "center" }}><Ionicons name="chevron-down" size={18} color={colors.textSecondary} /></Pressable>
              </View> : null}
            </View>
          ))}
        </View>
      )}
      {!archived && selected.length ? <ActionButton title={`Archive selected (${selected.length})`} onPress={archiveSelected} /> : null}
    </Screen>
  );
}

function ReorderHandle({ name, onDrop }: { name: string; onDrop: (offset: number) => void }) {
  const responder = useMemo(() => PanResponder.create({ onStartShouldSetPanResponder: () => true, onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 5, onPanResponderRelease: (_, gesture) => onDrop(Math.round(gesture.dy / 72)) }), [onDrop]);
  return <View accessibilityRole="adjustable" accessibilityLabel={`Drag to reorder ${name}`} {...responder.panHandlers} style={{ minWidth: 36, minHeight: 32, alignItems: "center", justifyContent: "center" }}><Ionicons name="reorder-three-outline" size={20} color="#68776F" /></View>;
}
