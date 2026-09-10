import { Pressable } from "react-native";
import { Label } from "./ui";
import { useTheme } from "../theme/ThemeProvider";
import { selectionHaptic } from "../lib/haptics";
export function ActionButton({
  title,
  onPress,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        selectionHaptic();
        onPress();
      }}
      style={({ pressed }) => ({
        minHeight: 48,
        padding: 16,
        borderRadius: 16,
        alignItems: "center",
        backgroundColor: colors.success,
        opacity: disabled || pressed ? 0.5 : 1,
      })}
    >
      <Label style={{ color: colors.onAccent, fontWeight: "600" }}>
        {title}
      </Label>
    </Pressable>
  );
}
