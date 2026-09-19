import { useCallback, useState } from "react";
import { Alert, Platform, Pressable, TextInput, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Screen, Label, styles } from "../../components/ui";
import { ScreenHeader } from "../../components/ScreenHeader";
import { useHabitRepository } from "../../hooks/useHabitRepository";
import type { Habit } from "../../features/habits/habit.types";
import { icons, scheduleLabel } from "../../features/habits/habit.options";
import { useTheme } from "../../theme/ThemeProvider";
import { useTranslation } from "../../lib/i18n";
import { currentTimestamp, localDateKey } from "../../lib/dates";
import { localIdentifier } from "../../lib/ids";

const TYPE_FILTERS = ["all", "check", "count", "quantity", "duration"] as const;
const TYPE_LABELS: Record<string, string> = {
  all: "Tümü", check: "Tamamla", count: "Sayı", quantity: "Miktar", duration: "Süre",
};

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
  const [selected, setSelected] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void retry;
      repo
        .list(true)
        .then((items) => {
          if (active) { setHabits(items); setError(""); setLoading(false); }
        })
        .catch(() => {
          if (active) { setError(t("loadHabitsError")); setLoading(false); }
        });
      return () => { active = false; };
    }, [repo, retry, t]),
  );

  const visible = habits
    .filter((h) => Boolean(h.archivedAt) === archived)
    .filter((h) => typeFilter === "all" || h.type === typeFilter)
    .filter((h) =>
      `${h.name} ${h.description ?? ""} ${h.groupName ?? ""}`
        .toLocaleLowerCase(language)
        .includes(query.trim().toLocaleLowerCase(language))
    )
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const move = async (id: string, direction: -1 | 1) => {
    const index = visible.findIndex((h) => h.id === id);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= visible.length) return;
    const reordered = [...visible];
    [reordered[index], reordered[next]] = [reordered[next], reordered[index]];
    setHabits((current) => {
      const order = new Map(reordered.map((h, i) => [h.id, i + 1]));
      return current.map((h) => order.has(h.id) ? { ...h, sortOrder: order.get(h.id)! } : h);
    });
    try { await repo.reorder(reordered.map((h) => h.id)); }
    catch { setError(t("saveError")); setRetry((v) => v + 1); }
  };

  const duplicate = async (habit: Habit) => {
    const now = currentTimestamp();
    const copy: Habit = {
      ...habit,
      id: localIdentifier(),
      name: `${habit.name} Copy`,
      createdAt: now,
      archivedAt: null,
      sortOrder: habits.length + 1,
      schedule: habit.schedule
        ? { ...habit.schedule, startDate: localDateKey(new Date()), endDate: null }
        : undefined,
    };
    try { await repo.save(copy, habit.groupName ?? null); setRetry((v) => v + 1); }
    catch { setError(t("saveError")); }
  };

  const archiveSelected = () =>
    Alert.alert(
      "Arşivle",
      `${selected.length} alışkanlık arşive taşınacak.`,
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("archived"),
          style: "destructive",
          onPress: () =>
            void repo
              .archiveMany(selected, currentTimestamp())
              .then(() => { setSelected([]); setRetry((v) => v + 1); })
              .catch(() => setError(t("saveError"))),
        },
      ]
    );

  return (
    <Screen>
      <ScreenHeader title={t("habits")} subtitle={t("makeRoom")} />

      {/* ── Add button ── */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("addHabit")}
        onPress={() => router.push("/habit/new")}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          paddingVertical: 14,
          borderRadius: 16,
          backgroundColor: colors.success,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Ionicons name="add" size={20} color={colors.onAccent} />
        <Label style={{ fontWeight: "700", color: colors.onAccent, fontSize: 15 }}>
          {t("addHabit")}
        </Label>
      </Pressable>

      {/* ── Quick templates ── */}
      <View style={{ gap: 8 }}>
        <Label secondary style={[styles.caption, { textTransform: "uppercase", letterSpacing: 0.8 }]}>
          Hızlı Şablonlar
        </Label>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {[
            { name: "Su İç", icon: "water-outline", emoji: "💧", type: "quantity" as const, targetValue: 8, unit: "bardak" },
            { name: "Oku", icon: "book-outline", emoji: "📚", type: "duration" as const, targetValue: 1200, unit: "seconds" },
            { name: "Yürü", icon: "walk-outline", emoji: "🚶", type: "count" as const, targetValue: 8000, unit: "adım" },
          ].map((template) => (
            <Pressable
              key={template.name}
              accessibilityRole="button"
              accessibilityLabel={`${template.name} alışkanlığı oluştur`}
              onPress={async () => {
                const now = currentTimestamp();
                const startDate = localDateKey(new Date());
                const habit: Habit = {
                  id: localIdentifier(),
                  name: template.name,
                  icon: template.icon,
                  color: "#32694F",
                  description: null,
                  type: template.type,
                  targetValue: template.targetValue,
                  unit: template.unit,
                  goalPeriod: "daily",
                  groupId: null,
                  sortOrder: habits.length + 1,
                  schedule: { type: "daily", weekdays: [], daysOfMonth: [], intervalDays: null, occurrences: null, startDate, endDate: null },
                  frequencyType: "daily",
                  scheduledDays: [],
                  reminderEnabled: false,
                  reminderTime: null,
                  createdAt: now,
                  archivedAt: null,
                };
                try { await repo.save(habit); setRetry((v) => v + 1); }
                catch { setError(t("saveError")); }
              }}
              style={({ pressed }) => ({
                flex: 1,
                alignItems: "center",
                gap: 4,
                paddingVertical: 12,
                paddingHorizontal: 8,
                borderRadius: 14,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Label style={{ fontSize: 20 }}>{template.emoji}</Label>
              <Label style={{ fontSize: 12, fontWeight: "600", textAlign: "center" }}>{template.name}</Label>
            </Pressable>
          ))}
        </View>
      </View>

      {/* ── Search ── */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          backgroundColor: colors.surface,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: 14,
          paddingVertical: 10,
        }}
      >
        <Ionicons name="search" size={17} color={colors.textSecondary} />
        <TextInput
          accessibilityLabel="Alışkanlık ara"
          placeholder="Ara..."
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={setQuery}
          style={{ flex: 1, color: colors.textPrimary, fontSize: 15 }}
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery("")} accessibilityRole="button" accessibilityLabel="Aramayı temizle">
            <Ionicons name="close-circle" size={17} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>

      {/* ── Type filter — segmented ── */}
      <View
        style={{
          flexDirection: "row",
          backgroundColor: colors.surface,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 3,
          gap: 3,
        }}
      >
        {TYPE_FILTERS.map((value) => (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityState={{ selected: typeFilter === value }}
            onPress={() => setTypeFilter(value)}
            style={{
              flex: 1,
              alignItems: "center",
              paddingVertical: 7,
              borderRadius: 11,
              backgroundColor: typeFilter === value ? colors.success : "transparent",
            }}
          >
            <Label
              style={{
                fontSize: 11,
                fontWeight: "600",
                color: typeFilter === value ? colors.onAccent : colors.textSecondary,
              }}
            >
              {TYPE_LABELS[value]}
            </Label>
          </Pressable>
        ))}
      </View>

      {/* ── Active / Archived toggle ── */}
      <View style={{ flexDirection: "row", gap: 8 }}>
        {[false, true].map((value) => (
          <Pressable
            key={String(value)}
            accessibilityRole="button"
            accessibilityLabel={value ? t("showArchived") : t("showActive")}
            accessibilityState={{ selected: archived === value }}
            onPress={() => setArchived(value)}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 10,
              backgroundColor: archived === value ? colors.surface : "transparent",
              borderWidth: archived === value ? 1 : 0,
              borderColor: colors.border,
            }}
          >
            <Label style={{ fontWeight: archived === value ? "600" : "400", color: archived === value ? colors.textPrimary : colors.textSecondary }}>
              {value ? t("archived") : t("active")}
            </Label>
          </Pressable>
        ))}
      </View>

      {/* ── List ── */}
      {loading ? (
        <Label secondary>{t("loadingHabits")}</Label>
      ) : error ? (
        <View style={{ gap: 12 }}>
          <Label>{error}</Label>
          <Pressable
            accessibilityRole="button"
            onPress={() => setRetry((v) => v + 1)}
            style={{ padding: 14, borderRadius: 14, backgroundColor: colors.surface, alignItems: "center" }}
          >
            <Label>{t("tryAgain")}</Label>
          </Pressable>
        </View>
      ) : visible.length === 0 ? (
        <View style={{ gap: 12, paddingTop: 8 }}>
          <Label style={[styles.heading, { fontSize: 20 }]}>
            {archived ? t("noArchived") : t("startSmall")}
          </Label>
          <Label secondary>{archived ? t("archivedHere") : t("addHabitHint")}</Label>
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          {visible.map((habit) => (
            <HabitManageRow
              key={habit.id}
              habit={habit}
              archived={archived}
              selected={selected.includes(habit.id)}
              isFirst={visible[0]?.id === habit.id}
              isLast={visible.at(-1)?.id === habit.id}
              language={language}
              onSelect={() =>
                setSelected((current) =>
                  current.includes(habit.id)
                    ? current.filter((id) => id !== habit.id)
                    : [...current, habit.id]
                )
              }
              onEdit={() => router.push({ pathname: "/habit/[id]", params: { id: habit.id } })}
              onDuplicate={() => void duplicate(habit)}
              onMoveUp={() => void move(habit.id, -1)}
              onMoveDown={() => void move(habit.id, 1)}
            />
          ))}
        </View>
      )}

      {/* ── Bulk archive bar ── */}
      {!archived && selected.length > 0 && (
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Label secondary style={{ fontSize: 14 }}>{selected.length} seçildi</Label>
          <Pressable
            accessibilityRole="button"
            onPress={archiveSelected}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 10,
              backgroundColor: `#FF453A20`,
            }}
          >
            <Label style={{ color: "#FF6B6B", fontWeight: "600", fontSize: 14 }}>
              Arşivle ({selected.length})
            </Label>
          </Pressable>
        </View>
      )}
    </Screen>
  );
}

// ─────────────────────────────────────────────
// HabitManageRow — clean card with actions
// ─────────────────────────────────────────────
function HabitManageRow({
  habit, archived, selected, isFirst, isLast, language,
  onSelect, onEdit, onDuplicate, onMoveUp, onMoveDown,
}: {
  habit: Habit;
  archived: boolean;
  selected: boolean;
  isFirst: boolean;
  isLast: boolean;
  language: string;
  onSelect: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        backgroundColor: selected ? colors.successSoft : colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: selected ? `${colors.success}40` : colors.border,
        overflow: "hidden",
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${habit.name} düzenle`}
        onPress={onEdit}
        style={{ padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }}
      >
        {/* Selection checkbox (active only) */}
        {!archived && (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={`${habit.name} seç`}
            onPress={onSelect}
            hitSlop={8}
          >
            <Ionicons
              name={selected ? "checkmark-circle" : "ellipse-outline"}
              size={22}
              color={selected ? colors.success : colors.textSecondary}
            />
          </Pressable>
        )}

        {/* Icon */}
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: `${habit.color}22`,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name={(icons.find((i) => i === habit.icon) ?? "leaf-outline") as any}
            size={20}
            color={habit.color}
          />
        </View>

        {/* Name + schedule */}
        <View style={{ flex: 1, gap: 3 }}>
          <Label style={{ fontWeight: "600", fontSize: 15 }}>{habit.name}</Label>
          <Label secondary style={{ fontSize: 12 }}>
            {scheduleLabel(habit.frequencyType, habit.scheduledDays, language as "en" | "tr" | undefined)}
          </Label>
        </View>

        <Ionicons name="chevron-forward" size={17} color={colors.textSecondary} />
      </Pressable>

      {/* Action strip — only active habits */}
      {!archived && (
        <View
          style={{
            flexDirection: "row",
            borderTopWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${habit.name} kopyala`}
            onPress={onDuplicate}
            style={{ flex: 1, alignItems: "center", paddingVertical: 9 }}
          >
            <Ionicons name="copy-outline" size={17} color={colors.textSecondary} />
          </Pressable>
          <View style={{ width: 1, backgroundColor: colors.border }} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${habit.name} yukarı taşı`}
            disabled={isFirst}
            onPress={onMoveUp}
            style={{ flex: 1, alignItems: "center", paddingVertical: 9, opacity: isFirst ? 0.3 : 1 }}
          >
            <Ionicons name="chevron-up" size={17} color={colors.textSecondary} />
          </Pressable>
          <View style={{ width: 1, backgroundColor: colors.border }} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${habit.name} aşağı taşı`}
            disabled={isLast}
            onPress={onMoveDown}
            style={{ flex: 1, alignItems: "center", paddingVertical: 9, opacity: isLast ? 0.3 : 1 }}
          >
            <Ionicons name="chevron-down" size={17} color={colors.textSecondary} />
          </Pressable>
        </View>
      )}
    </View>
  );
}
