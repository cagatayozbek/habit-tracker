import { currentTimestamp, localDateKey } from "../lib/dates";
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
import type { Habit, HabitSchedule } from "../features/habits/habit.types";
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
  const [description, setDescription] = useState(habit?.description ?? "");
  const [type, setType] = useState<Habit["type"]>(habit?.type ?? "check");
  const [targetValue, setTargetValue] = useState(String(habit?.targetValue ?? 1));
  const [unit, setUnit] = useState(habit?.unit ?? "");
  const [goalPeriod, setGoalPeriod] = useState<Habit["goalPeriod"]>(habit?.goalPeriod ?? "daily");
  const [groupName, setGroupName] = useState(habit?.groupName ?? "");
  const [scheduleType, setScheduleType] = useState<HabitSchedule["type"]>(habit?.schedule?.type ?? (habit?.frequencyType === "specific_days" ? "weekdays" : "daily"));
  const [days, setDays] = useState(habit?.scheduledDays ?? [1, 3, 5]);
  const [monthDays, setMonthDays] = useState(habit?.schedule?.daysOfMonth.join(", ") ?? "");
  const [occurrences, setOccurrences] = useState(habit?.schedule?.occurrences?.toString() ?? "1");
  const [intervalDays, setIntervalDays] = useState(habit?.schedule?.intervalDays?.toString() ?? "2");
  const [scheduleStart, setScheduleStart] = useState(habit?.schedule?.startDate ?? localDateKey(new Date()));
  const [scheduleEnd, setScheduleEnd] = useState(habit?.schedule?.endDate ?? "");
  const [reminderEnabled, setReminderEnabled] = useState(
    habit?.reminderEnabled ?? false,
  );
  const [reminderTime, setReminderTime] = useState(
    habit?.reminderTime ?? "09:00",
  );
  const [additionalReminderTimes, setAdditionalReminderTimes] = useState((habit?.reminderTimes ?? []).filter((value) => value !== (habit?.reminderTime ?? "09:00")).join(", "));
  const [followUpMinutes, setFollowUpMinutes] = useState(habit?.followUpMinutes?.toString() ?? "");
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
    if (scheduleType === "weekdays" && !days.length) {
      setError(t("dayRequired"));
      return;
    }
    const parsedMonthDays = monthDays.trim() ? monthDays.split(",").map((value) => Number(value.trim())) : [];
    const parsedOccurrences = Number(occurrences);
    const parsedInterval = Number(intervalDays);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduleStart) || (scheduleEnd && !/^\d{4}-\d{2}-\d{2}$/.test(scheduleEnd)) || (scheduleType === "days_of_month" && !parsedMonthDays.length) || (["times_per_week", "times_per_month"].includes(scheduleType) && (!Number.isInteger(parsedOccurrences) || parsedOccurrences < 1)) || (scheduleType === "interval" && (!Number.isInteger(parsedInterval) || parsedInterval < 1))) {
      setError("Enter a valid schedule.");
      return;
    }
    const parsedTarget = Number(targetValue.replace(",", "."));
    const parsedReminderTimes = [reminderTime, ...additionalReminderTimes.split(",").map((value) => value.trim()).filter(Boolean)];
    const parsedFollowUp = followUpMinutes.trim() ? Number(followUpMinutes) : null;
    if (reminderEnabled && (parsedReminderTimes.some((value) => !parseReminderTime(value)) || (parsedFollowUp !== null && (!Number.isInteger(parsedFollowUp) || parsedFollowUp <= 0)))) {
      setError("Enter reminder times as HH:MM and a positive follow-up delay.");
      return;
    }
    if (!Number.isFinite(parsedTarget) || parsedTarget <= 0 || (type === "count" && !Number.isInteger(parsedTarget))) {
      setError("Enter a valid target.");
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
        description: description.trim() || null,
        type,
        targetValue: type === "check" ? 1 : parsedTarget,
        unit: type === "check" ? null : unit.trim() || null,
        goalPeriod,
        groupId: habit?.groupId ?? null,
        sortOrder: habit?.sortOrder ?? Date.now(),
        schedule: {
          type: scheduleType,
          weekdays: scheduleType === "weekdays" ? [...days].sort() : [],
          daysOfMonth: scheduleType === "days_of_month" ? parsedMonthDays : [],
          intervalDays: scheduleType === "interval" ? parsedInterval : null,
          occurrences: ["times_per_week", "times_per_month"].includes(scheduleType) ? parsedOccurrences : null,
          startDate: scheduleStart, endDate: scheduleEnd || null,
        },
        frequencyType: scheduleType === "daily" ? "daily" : "specific_days",
        scheduledDays: scheduleType === "weekdays" ? [...days].sort() : [],
        reminderEnabled,
        reminderTime: reminderEnabled ? reminderTime : null,
        reminderTimes: reminderEnabled ? [...new Set(parsedReminderTimes)] : [],
        followUpMinutes: reminderEnabled ? parsedFollowUp : null,
        createdAt: habit?.createdAt ?? now,
        archivedAt: habit?.archivedAt ?? null,
      };
      await repo.save(savedHabit, groupName || null);
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
        <View style={{ gap: 12 }}>
          <Label style={styles.heading}>Details</Label>
          <TextInput
            accessibilityLabel="Habit description"
            placeholder="Optional note"
            placeholderTextColor={colors.textSecondary}
            value={description}
            onChangeText={setDescription}
            editable={!busy}
            maxLength={300}
            style={{ color: colors.textPrimary, backgroundColor: colors.surface, padding: 16, borderRadius: 16, fontSize: 17, minHeight: 54 }}
          />
          <View style={[styles.row, { flexWrap: "wrap", gap: 8 }]}>
            {(["check", "count", "quantity", "duration"] as const).map((option) => (
              <Pressable key={option} disabled={busy} accessibilityRole="radio" accessibilityState={{ checked: type === option }} onPress={() => setType(option)} style={{ padding: 12, borderRadius: 12, backgroundColor: type === option ? colors.successSoft : colors.surface }}><Label>{option[0].toUpperCase() + option.slice(1)}</Label></Pressable>
            ))}
          </View>
          <TextInput accessibilityLabel="Habit group" placeholder="Optional group (e.g. Health)" placeholderTextColor={colors.textSecondary} value={groupName} onChangeText={setGroupName} editable={!busy} maxLength={40} style={{ color: colors.textPrimary, backgroundColor: colors.surface, padding: 16, borderRadius: 16, fontSize: 17, minHeight: 54 }} />
          {type !== "check" ? <View style={[styles.row, { gap: 8 }]}>
            <TextInput accessibilityLabel="Target value" keyboardType="decimal-pad" value={targetValue} onChangeText={setTargetValue} editable={!busy} style={{ flex: 1, color: colors.textPrimary, backgroundColor: colors.surface, padding: 16, borderRadius: 16, fontSize: 17, minHeight: 54 }} />
            <TextInput accessibilityLabel="Unit" placeholder={type === "duration" ? "seconds" : "Unit"} placeholderTextColor={colors.textSecondary} value={unit} onChangeText={setUnit} editable={!busy} maxLength={24} style={{ flex: 1, color: colors.textPrimary, backgroundColor: colors.surface, padding: 16, borderRadius: 16, fontSize: 17, minHeight: 54 }} />
          </View> : null}
          <View style={[styles.row, { flexWrap: "wrap", gap: 8 }]}>
            {(["daily", "weekly", "monthly"] as const).map((option) => (
              <Pressable key={option} disabled={busy} accessibilityRole="radio" accessibilityState={{ checked: goalPeriod === option }} onPress={() => setGoalPeriod(option)} style={{ padding: 12, borderRadius: 12, backgroundColor: goalPeriod === option ? colors.successSoft : colors.surface }}><Label>{option[0].toUpperCase() + option.slice(1)}</Label></Pressable>
            ))}
          </View>
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
          {(["daily", "weekdays", "times_per_week", "times_per_month", "days_of_month", "interval"] as const).map((option) => (
            <Pressable
              disabled={busy}
              key={option}
              accessibilityRole="radio"
              accessibilityState={{ checked: scheduleType === option }}
              onPress={() => setScheduleType(option)}
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
                {option === "daily" ? t("everyDay") : option === "weekdays" ? t("specificWeekdays") : option === "times_per_week" ? "Times per week" : option === "times_per_month" ? "Times per month" : option === "days_of_month" ? "Days of month" : "Every N days"}
              </Label>
              {scheduleType === option ? (
                <Ionicons name="checkmark" size={22} color={colors.success} />
              ) : null}
            </Pressable>
          ))}
          {scheduleType === "weekdays" ? (
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
          {scheduleType === "days_of_month" ? <TextInput accessibilityLabel="Days of month" placeholder="e.g. 1, 15, 30" placeholderTextColor={colors.textSecondary} value={monthDays} onChangeText={setMonthDays} keyboardType="number-pad" style={{ color: colors.textPrimary, backgroundColor: colors.surface, padding: 16, borderRadius: 16, fontSize: 17, minHeight: 54 }} /> : null}
          {["times_per_week", "times_per_month"].includes(scheduleType) ? <TextInput accessibilityLabel="Occurrences" placeholder="Times" placeholderTextColor={colors.textSecondary} value={occurrences} onChangeText={setOccurrences} keyboardType="number-pad" style={{ color: colors.textPrimary, backgroundColor: colors.surface, padding: 16, borderRadius: 16, fontSize: 17, minHeight: 54 }} /> : null}
          {scheduleType === "interval" ? <TextInput accessibilityLabel="Interval days" placeholder="Every N days" placeholderTextColor={colors.textSecondary} value={intervalDays} onChangeText={setIntervalDays} keyboardType="number-pad" style={{ color: colors.textPrimary, backgroundColor: colors.surface, padding: 16, borderRadius: 16, fontSize: 17, minHeight: 54 }} /> : null}
          <TextInput accessibilityLabel="Schedule start date" placeholder="YYYY-MM-DD" placeholderTextColor={colors.textSecondary} value={scheduleStart} onChangeText={setScheduleStart} style={{ color: colors.textPrimary, backgroundColor: colors.surface, padding: 16, borderRadius: 16, fontSize: 17, minHeight: 54 }} />
          <TextInput accessibilityLabel="Schedule end date" placeholder="Optional end date (YYYY-MM-DD)" placeholderTextColor={colors.textSecondary} value={scheduleEnd} onChangeText={setScheduleEnd} style={{ color: colors.textPrimary, backgroundColor: colors.surface, padding: 16, borderRadius: 16, fontSize: 17, minHeight: 54 }} />
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
            <><DateTimePicker
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
            <TextInput accessibilityLabel="Additional reminder times" placeholder="More times, e.g. 13:00, 18:30" placeholderTextColor={colors.textSecondary} value={additionalReminderTimes} onChangeText={setAdditionalReminderTimes} autoCapitalize="none" style={{ color: colors.textPrimary, backgroundColor: colors.surface, padding: 16, borderRadius: 16, fontSize: 17, minHeight: 54 }} />
            <TextInput accessibilityLabel="Incomplete follow-up delay" placeholder="Optional follow-up minutes" placeholderTextColor={colors.textSecondary} value={followUpMinutes} onChangeText={setFollowUpMinutes} keyboardType="number-pad" style={{ color: colors.textPrimary, backgroundColor: colors.surface, padding: 16, borderRadius: 16, fontSize: 17, minHeight: 54 }} />
            <Label secondary style={styles.caption}>Reminders only run on scheduled days. Completing the habit cancels the rest of today’s reminders.</Label></>
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
