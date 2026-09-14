import { Pressable, View } from "react-native";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Screen, Label, styles } from "../components/ui";
import { useTheme } from "../theme/ThemeProvider";
import { selectionHaptic } from "../lib/haptics";
import { useTranslation, type Language } from "../lib/i18n";
import { HealthSettings } from "../components/HealthSettings";
import { BackupSettings } from "../components/BackupSettings";
export default function Settings() {
  const { colors, appearance, setAppearance } = useTheme();
  const { t, language, setLanguage } = useTranslation();
  return (
    <Screen>
      <View style={styles.between}>
        <Label accessibilityRole="header" style={styles.title}>
          {t("settings")}
        </Label>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("closeSettings")}
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/")
          }
          style={{ minHeight: 44, minWidth: 44, justifyContent: "center" }}
        >
          <Label style={{ color: colors.success, fontWeight: "600" }}>
            {t("done")}
          </Label>
        </Pressable>
      </View>
      <View style={{ gap: 12 }}>
        <Label style={styles.heading}>{t("appearance")}</Label>
        <Label secondary>{t("appearanceHint")}</Label>
        <View
          style={{
            marginTop: 12,
            backgroundColor: colors.surface,
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          {(["system", "light", "dark"] as const).map((option, index) => (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityState={{ checked: appearance === option }}
              aria-checked={appearance === option}
              accessibilityLabel={`${t(option)} ${t("appearance")}`}
              onPress={() => {
                setAppearance(option);
                selectionHaptic();
              }}
              style={({ pressed }) => [
                styles.between,
                {
                  padding: 20,
                  minHeight: 64,
                  borderTopWidth: index ? 1 : 0,
                  borderColor: colors.border,
                  opacity: pressed ? 0.6 : 1,
                },
              ]}
            >
              <Label>{t(option)}</Label>
              {appearance === option ? (
                <Ionicons name="checkmark" size={23} color={colors.success} />
              ) : null}
            </Pressable>
          ))}
        </View>
        <Label secondary style={styles.caption}>
          {t("systemAppearance")}
        </Label>
      </View>
      <View style={{ gap: 12 }}>
        <Label style={styles.heading}>{t("language")}</Label>
        <Label secondary>{t("languageHint")}</Label>
        <View style={{ marginTop: 12, backgroundColor: colors.surface, borderRadius: 16, overflow: "hidden" }}>
          {(["en", "tr"] as const).map((option, index) => (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityState={{ checked: language === option }}
              accessibilityLabel={option === "tr" ? "Türkçe" : "English"}
              onPress={() => { setLanguage(option as Language); selectionHaptic(); }}
              style={({ pressed }) => [styles.between, { padding: 20, minHeight: 64, borderTopWidth: index ? 1 : 0, borderColor: colors.border, opacity: pressed ? 0.6 : 1 }]}
            >
              <Label>{option === "tr" ? "Türkçe" : "English"}</Label>
              {language === option ? <Ionicons name="checkmark" size={23} color={colors.success} /> : null}
            </Pressable>
          ))}
        </View>
      </View>
      <View style={{ gap: 8 }}>
        <Label style={styles.heading}>{t("deviceTitle")}</Label>
        <Label secondary style={{ lineHeight: 25 }}>
          {t("deviceOnly")}
        </Label>
      </View>
      <HealthSettings />
      <BackupSettings />
    </Screen>
  );
}
