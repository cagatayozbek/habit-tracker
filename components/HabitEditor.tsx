import { currentTimestamp } from "../lib/dates";
import { useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Pressable,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Screen, Label, styles } from "./ui";
import { ActionButton } from "./ActionButton";
import { useTheme } from "../theme/ThemeProvider";
import { useHabitRepository } from "../hooks/useHabitRepository";
import type { Habit } from "../features/habits/habit.types";
import {
  icons,
  colorOptions,
  weekdayLabels,
} from "../features/habits/habit.options";
import { selectionHaptic } from "../lib/haptics";
import { localIdentifier } from "../lib/ids";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  formatReminderTime,
  parseReminderTime,
  requestReminderPermission,
  syncHabitReminders,
} from "../features/notifications/notification.service";
import { useTranslation } from "../lib/i18n";
export function HabitEditor({ habit }: { habit?: Habit }) {
  const repo = useHabitRepository();
  const { colors } = useTheme();
  const { t, language } = useTranslation();
  const weekdays = weekdayLabels(language);
  const [name, setName] = useState(habit?.name ?? "");
  const [icon, setIcon] = useState(habit?.icon ?? icons[0]);
  const [color, setColor] = useState(habit?.color ?? colorOptions[0].value);
  const [frequency, setFrequency] = useState<Habit["frequencyType"]>(
    habit?.frequencyType ?? "daily",
  );
  const [days, setDays] = useState(habit?.scheduledDays ?? [1, 3, 5]);
  const [reminderEnabled, setReminderEnabled] = useState(
    habit?.reminderEnabled ?? false,
  );
  const [reminderTime, setReminderTime] = useState(
    habit?.reminderTime ?? "09:00",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const exit = () =>
    router.canGoBack() ? router.back() : router.replace("/habits");
  const run = async (action: () => Promise<void>) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
      selectionHaptic();
      exit();
    } catch {
      setError(t("saveError"));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  const save = () => {
    if (!name.trim()) {
      setError(t("nameRequired"));
      return;
    }
    if (frequency === "specific_days" && !days.length) {
      setError(t("dayRequired"));
      return;
    }
    void run(async () => {
      const now = currentTimestamp();
      const savedHabit: Habit = {
        ...habit,
        id:
          habit?.id ??
          localIdentifier(),
        name: name.trim(),
        icon,
        color,
        frequencyType: frequency,
        scheduledDays: frequency === "daily" ? [] : [...days].sort(),
        reminderEnabled,
        reminderTime: reminderEnabled ? reminderTime : null,
        createdAt: habit?.createdAt ?? now,
        archivedAt: habit?.archivedAt ?? null,
      };
      await repo.save(savedHabit);
      await syncHabitReminders(savedHabit).catch(() => undefined);
    });
  };
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Screen>
        <View style={styles.between}>
          <Label style={styles.title}>
            {habit ? t("editHabit") : t("newHabit")}
          </Label>
          <Pressable
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={t("cancelEdit")}
            onPress={exit}
            style={{ padding: 12, minHeight: 44 }}
          >
            <Label>{t("cancel")}</Label>
          </Pressable>
        </View>
        <View style={{ gap: 12 }}>
          <Label style={styles.heading}>{t("name")}</Label>
          <TextInput
            accessibilityLabel={t("habitName")}
            placeholder={t("exampleHabit")}
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={setName}
            editable={!busy}
            maxLength={100}
            returnKeyType="done"
            autoFocus={!habit}
            onSubmitEditing={() => Keyboard.dismiss()}
            style={{
              color: colors.textPrimary,
              backgroundColor: colors.surface,
              padding: 16,
              borderRadius: 16,
              fontSize: 17,
              minHeight: 54,
            }}
          />
        </View>
        <View style={{ gap: 16 }}>
          <Label style={styles.heading}>{t("icon")}</Label>
          <View style={[styles.row, { flexWrap: "wrap" }]}>
            {icons.map((option) => (
              <Pressable
                disabled={busy}
                key={option}
                accessibilityRole="button"
                accessibilityLabel={option
                  .replace("-outline", "")
                  .replaceAll("-", " ")}
                accessibilityState={{ selected: icon === option }}
                onPress={() => setIcon(option)}
                style={{
                  padding: 14,
                  borderRadius: 16,
                  borderWidth: 2,
                  borderColor: icon === option ? colors.success : colors.border,
                }}
              >
                <Ionicons name={option} size={25} color={color} />
              </Pressable>
            ))}
          </View>
        </View>
        <View style={{ gap: 16 }}>
          <Label style={styles.heading}>{t("color")}</Label>
          <View style={[styles.row, { flexWrap: "wrap" }]}>
            {colorOptions.map((option) => (
              <Pressable
                disabled={busy}
                key={option.value}
                accessibilityRole="button"
                accessibilityLabel={option.name}
                accessibilityState={{ selected: color === option.value }}
                onPress={() => setColor(option.value)}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  borderWidth: 3,
                  borderColor:
                    color === option.value ? colors.textPrimary : "transparent",
                  backgroundColor: option.value,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {color === option.value ? (
                  <Ionicons name="checkmark" color="#FFFFFF" size={23} />
                ) : null}
              </Pressable>
            ))}
          </View>
        </View>
        <View style={{ gap: 16 }}>
          <Label style={styles.heading}>{t("frequency")}</Label>
          {(["daily", "specific_days"] as const).map((option) => (
            <Pressable
              disabled={busy}
              key={option}
              accessibilityRole="radio"
              accessibilityState={{ checked: frequency === option }}
              onPress={() => setFrequency(option)}
              style={[
                styles.between,
                {
                  padding: 16,
                  backgroundColor: colors.surface,
                  borderRadius: 16,
                  minHeight: 52,
                },
              ]}
            >
              <Label>
                {option === "daily" ? t("everyDay") : t("specificWeekdays")}
              </Label>
              {frequency === option ? (
                <Ionicons name="checkmark" size={22} color={colors.success} />
              ) : null}
            </Pressable>
          ))}
          {frequency === "specific_days" ? (
            <View style={[styles.row, { flexWrap: "wrap", gap: 8 }]}>
              {weekdays.map((day, index) => (
                <Pressable
                  disabled={busy}
                  key={day}
                  accessibilityRole="checkbox"
                  accessibilityLabel={day}
                  accessibilityState={{ checked: days.includes(index + 1) }}
                  onPress={() =>
                    setDays((current) =>
                      current.includes(index + 1)
                        ? current.filter((value) => value !== index + 1)
                        : [...current, index + 1],
                    )
                  }
                  style={{
                    minWidth: 48,
                    minHeight: 48,
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: days.includes(index + 1)
                      ? colors.successSoft
                      : colors.surface,
                  }}
                >
                  <Label>{day}</Label>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
        <View style={{ gap: 12 }}>
          <Label style={styles.heading}>{t("reminder")}</Label>
          <Pressable
            disabled={busy}
            accessibilityRole="switch"
            accessibilityState={{ checked: reminderEnabled }}
            onPress={() =>
              void (async () => {
                if (!reminderEnabled && !(await requestReminderPermission())) {
                  setError(
                    t("notificationsOff"),
                  );
                  return;
                }
                setError("");
                setReminderEnabled((enabled) => !enabled);
              })()
            }
            style={[
              styles.between,
              {
                padding: 16,
                backgroundColor: colors.surface,
                borderRadius: 16,
                minHeight: 52,
              },
            ]}
          >
            <Label>{t("remindMe")}</Label>
            <Ionicons
              name={
                reminderEnabled ? "notifications" : "notifications-off-outline"
              }
              size={22}
              color={reminderEnabled ? colors.success : colors.textSecondary}
            />
          </Pressable>
          {reminderEnabled ? (
            <DateTimePicker
              value={(() => {
                const time = parseReminderTime(reminderTime) ?? {
                  hour: 9,
                  minute: 0,
                };
                const date = new Date();
                date.setHours(time.hour, time.minute, 0, 0);
                return date;
              })()}
              mode="time"
              display="default"
              onChange={(_, selected) => {
                if (selected) setReminderTime(formatReminderTime(selected));
              }}
            />
          ) : null}
        </View>
        {error ? (
          <Label accessibilityRole="alert" accessibilityLiveRegion="assertive">
            {error}
          </Label>
        ) : null}
        <ActionButton
          title={busy ? t("saving") : habit ? t("saveChanges") : t("createHabit")}
          disabled={busy}
          onPress={save}
        />
        {habit ? (
          <View style={{ gap: 16 }}>
            <ActionButton
              title={habit.archivedAt ? t("restoreHabit") : t("archiveHabit")}
              disabled={busy}
              onPress={() =>
                void run(() =>
                  habit.archivedAt
                    ? repo
                        .save({ ...habit, archivedAt: null })
                        .then(() =>
                          syncHabitReminders({ ...habit, archivedAt: null }).catch(
                            () => undefined,
                          ),
                        )
                    : repo
                        .archive(habit.id, currentTimestamp())
                        .then(() =>
                          syncHabitReminders({
                            ...habit,
                            archivedAt: currentTimestamp(),
                          }).catch(() => undefined),
                        ),
                )
              }
            />
            <Pressable
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={`${t("deleteHabit")} ${habit.name}`}
              accessibilityHint={t("deleteHint")}
              onPress={() =>
                Alert.alert(
                  t("deleteTitle"),
                  `“${habit.name}” ${t("deleteHistory")}`,
                  [
                    { text: t("cancel"), style: "cancel" },
                    {
                      text: t("deleteHabit"),
                      style: "destructive",
                      onPress: () =>
                        void run(() =>
                          repo
                            .delete(habit.id)
                            .then(() =>
                              syncHabitReminders({
                                ...habit,
                                reminderEnabled: false,
                                reminderTime: null,
                              }).catch(() => undefined),
                            ),
                        ),
                    },
                  ],
                )
              }
              style={{ padding: 16, minHeight: 48, alignItems: "center" }}
            >
              <Label>{t("deleteHabit")}</Label>
            </Pressable>
          </View>
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}
