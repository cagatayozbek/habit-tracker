import { type ComponentProps, useState } from "react";
import { Animated, Platform, Pressable, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../theme/ThemeProvider";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { selectionHaptic } from "../lib/haptics";
import { Label, styles } from "./ui";
import { useTranslation } from "../lib/i18n";
export function HabitRow({
  habit,
  completed,
  onToggle,
  disabled = false,
}: {
  habit: {
    id: string;
    name: string;
    icon: string;
    color: string;
    subtitle?: string;
    streak?: number;
  };
  completed?: boolean;
  onToggle?: () => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const [scale] = useState(() => new Animated.Value(1));
  const content = (
    <View
      style={[
        styles.row,
        {
          paddingVertical: 22,
          borderBottomWidth: 1,
          borderColor: colors.border,
        },
      ]}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 16,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.surface,
        }}
      >
        <Ionicons
          name={habit.icon as ComponentProps<typeof Ionicons>["name"]}
          size={24}
          color={habit.color}
        />
      </View>
      <View style={{ flex: 1, gap: 5 }}>
        <Label style={{ fontWeight: "600" }}>{habit.name}</Label>
        <Label secondary style={styles.caption}>
          {onToggle
            ? completed
              ? t("doneToday")
              : habit.subtitle ?? t("ready")
            : `${t("everyDay")} · ${habit.streak} ${t("dayStreak")}`}
        </Label>
      </View>
      {onToggle ? (
        <View
          style={{
            width: 30,
            height: 30,
            borderRadius: 15,
            borderWidth: completed ? 0 : 1.5,
            borderColor: colors.textSecondary,
            backgroundColor: completed ? colors.success : "transparent",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {completed ? (
            <Ionicons name="checkmark" size={20} color={colors.onAccent} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
  if (!onToggle) return content;
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        disabled={disabled}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: completed, disabled }}
        aria-checked={completed}
        accessibilityLabel={habit.name}
        accessibilityHint={t("toggleToday")}
        onPress={() => {
          onToggle();
          selectionHaptic();
        }}
        onPressIn={() => {
          if (!reduced)
            Animated.spring(scale, {
              toValue: 0.98,
              useNativeDriver: Platform.OS !== "web",
              speed: 35,
            }).start();
        }}
        onPressOut={() => {
          if (!reduced)
            Animated.spring(scale, {
              toValue: 1,
              useNativeDriver: Platform.OS !== "web",
              speed: 35,
            }).start();
        }}
      >
        {content}
      </Pressable>
    </Animated.View>
  );
}
