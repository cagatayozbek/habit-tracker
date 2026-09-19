import { Pressable, View } from "react-native";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Label } from "./ui";
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
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <Label
          accessibilityRole="header"
          style={{
            fontSize: 32,
            fontWeight: "700",
            letterSpacing: -1,
            color: colors.textPrimary,
          }}
        >
          {title}
        </Label>
        <Label
          secondary
          style={{ fontSize: 14, letterSpacing: 0 }}
        >
          {subtitle}
        </Label>
      </View>
      <Pressable
        onPress={() => router.push("/settings")}
        accessibilityRole="button"
        accessibilityLabel={t("openSettings")}
        style={({ pressed }) => ({
          width: 44,
          height: 44,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 22,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          opacity: pressed ? 0.6 : 1,
          marginTop: 4,
        })}
      >
        <Ionicons name="person-outline" size={20} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}
