import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { HabitEditor } from "../../components/HabitEditor";
import { Screen, Label } from "../../components/ui";
import { ActionButton } from "../../components/ActionButton";
import { useHabitRepository } from "../../hooks/useHabitRepository";
import type { Habit } from "../../features/habits/habit.types";
import { useTranslation } from "../../lib/i18n";
export default function EditHabit() {
  const { t } = useTranslation();
  return Platform.OS === "web" ? (
    <Screen>
      <Label>{t("openIosManage")}</Label>
    </Screen>
  ) : (
    <SavedHabit />
  );
}
function SavedHabit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const repo = useHabitRepository();
  const { t } = useTranslation();
  const [habit, setHabit] = useState<Habit | null>(null);
  const [status, setStatus] = useState(t("loadingHabit"));
  useEffect(() => {
    let active = true;
    repo
      .get(id)
      .then((value) => {
        if (active) {
          setHabit(value);
          setStatus(value ? "" : t("habitNotFound"));
        }
      })
      .catch(() => {
        if (active)
          setStatus(t("loadHabitError"));
      });
    return () => {
      active = false;
    };
  }, [id, repo, t]);
  return habit ? (
    <HabitEditor key={habit.id} habit={habit} />
  ) : (
    <Screen>
      <Label>{status}</Label>
      <ActionButton
        title={t("backToHabits")}
        onPress={() => router.replace("/habits")}
      />
    </Screen>
  );
}
