import { Platform } from "react-native";
import { HabitEditor } from "../../components/HabitEditor";
import { Screen, Label } from "../../components/ui";
import { useTranslation } from "../../lib/i18n";
export default function NewHabit() {
  const { t } = useTranslation();
  return Platform.OS === "web" ? (
    <Screen>
      <Label>{t("openIosManage")}</Label>
    </Screen>
  ) : (
    <HabitEditor />
  );
}
