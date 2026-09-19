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
  const { colors, dark } = useTheme();
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const [scale] = useState(() => new Animated.Value(1));

  const content = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 18,
        backgroundColor: completed && dark
          ? colors.successSoft
          : colors.surface,
        borderWidth: 1,
        borderColor: completed && dark
          ? `${colors.success}40`
          : colors.border,
      }}
    >
      {/* Icon badge */}
      <View
        style={{
          width: 46,
          height: 46,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: `${habit.color}22`,
        }}
      >
        <Ionicons
          name={habit.icon as ComponentProps<typeof Ionicons>["name"]}
          size={22}
          color={completed ? colors.success : habit.color}
        />
      </View>

      {/* Text */}
      <View style={{ flex: 1, gap: 3 }}>
        <Label
          style={{
            fontWeight: "600",
            fontSize: 16,
            color: completed ? colors.success : colors.textPrimary,
          }}
        >
          {habit.name}
        </Label>
        <Label secondary style={styles.caption}>
          {onToggle
            ? completed
              ? t("doneToday")
              : habit.subtitle ?? t("ready")
            : habit.subtitle ??
              (habit.streak === undefined
                ? t("ready")
                : `${t("everyDay")} · ${habit.streak} ${t("dayStreak")}`)}
        </Label>
      </View>

      {/* Check circle */}
      {onToggle ? (
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            borderWidth: completed ? 0 : 1.5,
            borderColor: colors.textSecondary,
            backgroundColor: completed ? colors.success : "transparent",
            alignItems: "center",
            justifyContent: "center",
            ...(completed && dark
              ? {
                  shadowColor: colors.success,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.6,
                  shadowRadius: 8,
                }
              : {}),
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
              toValue: 0.97,
              useNativeDriver: Platform.OS !== "web",
              speed: 50,
            }).start();
        }}
        onPressOut={() => {
          if (!reduced)
            Animated.spring(scale, {
              toValue: 1,
              useNativeDriver: Platform.OS !== "web",
              speed: 50,
            }).start();
        }}
      >
        {content}
      </Pressable>
    </Animated.View>
  );
}
