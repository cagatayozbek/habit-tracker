import { type PropsWithChildren } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { spacing, typography } from "../theme/tokens";
export function Label({
  style,
  secondary = false,
  ...props
}: TextProps & { secondary?: boolean }) {
  const { colors } = useTheme();
  return (
    <Text
      {...props}
      style={[
        {
          color: secondary ? colors.textSecondary : colors.textPrimary,
          fontSize: typography.body,
        },
        style,
      ]}
    />
  );
}
export function Screen({ children }: PropsWithChildren) {
  const { colors } = useTheme();
  return (
    <SafeAreaView
      edges={["top", "left", "right", "bottom"]}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.content}
      >
        <View style={styles.inner}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}
export const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, flexGrow: 1 },
  inner: { width: "100%", maxWidth: 580, alignSelf: "center", gap: spacing.xl },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  title: { fontSize: typography.title, fontWeight: "700", letterSpacing: -1.2 },
  heading: {
    fontSize: typography.heading,
    fontWeight: "600",
    letterSpacing: -0.5,
  },
  caption: { fontSize: typography.caption, lineHeight: 20 },
});
