import { View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { Label, styles } from "./ui";
import type { HeatmapDay } from "../lib/progress";
import { useTranslation } from "../lib/i18n";
export function Heatmap({ days }: { days: readonly HeatmapDay[] }) {
  const { colors } = useTheme();
  const { t, language } = useTranslation();
  const shades = [
    colors.track,
    colors.successSoft,
    colors.success,
    colors.success,
    colors.success,
  ];
  return (
    <View style={{ gap: 12 }}>
      <View style={styles.between}>
        {(language === "tr" ? ["Nis", "May", "Haz", "Tem", "Ağu", "Eyl"] : ["Apr", "May", "Jun", "Jul", "Aug", "Sep"]).map((month) => (
          <Label secondary key={month} style={styles.caption}>
            {month}
          </Label>
        ))}
      </View>
      <View
        accessible
        accessibilityLabel={t("sixMonthHeatmap")}
        style={{ flexDirection: "row", gap: 3 }}
      >
        {Array.from({ length: Math.ceil(days.length / 7) }, (_, week) => (
          <View key={week} style={{ flex: 1, gap: 3 }}>
            {days.slice(week * 7, week * 7 + 7).map((day) => (
              <View
                key={day.date}
                style={{
                  aspectRatio: 1,
                  borderRadius: 2,
                  backgroundColor: shades[day.level],
                  opacity: day.level === 2 ? 0.45 : day.level === 3 ? 0.7 : 1,
                }}
              />
            ))}
          </View>
        ))}
      </View>
      <View style={[styles.row, { justifyContent: "flex-end", gap: 5 }]}>
        <Label secondary style={styles.caption}>
          {t("less")}
        </Label>
        {[0, 1, 2, 3, 4].map((level) => (
          <View
            key={level}
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              backgroundColor: shades[level],
              opacity: level === 2 ? 0.45 : level === 3 ? 0.7 : 1,
            }}
          />
        ))}
        <Label secondary style={styles.caption}>
          {t("more")}
        </Label>
      </View>
    </View>
  );
}
