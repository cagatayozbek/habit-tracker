import { Pressable, View } from "react-native";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Label, styles } from "./ui";
import { useTheme } from "../theme/ThemeProvider";
import { useTranslation } from "../lib/i18n";
export function ScreenHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <View style={styles.between}>
      <View style={{ flex: 1, gap: 6 }}>
        <Label secondary style={styles.caption}>
          {subtitle}
        </Label>
        <Label accessibilityRole="header" style={styles.title}>
          {title}
        </Label>
      </View>
      <Pressable
        onPress={() => router.push("/settings")}
        accessibilityRole="button"
        accessibilityLabel={t("openSettings")}
        style={({ pressed }) => ({
          width: 48,
          height: 48,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 24,
          backgroundColor: colors.surface,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Ionicons name="options-outline" size={23} color={colors.textPrimary} />
      </Pressable>
    </View>
  );
}
