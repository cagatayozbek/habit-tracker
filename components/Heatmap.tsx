import { View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { Label, styles } from "./ui";
import type { HeatmapDay } from "../lib/progress";
import { useTranslation } from "../lib/i18n";

export function Heatmap({ days }: { days: readonly HeatmapDay[] }) {
  const { colors, dark } = useTheme();
  const { t, language } = useTranslation();

  const shades = dark
    ? [
        "#1A1A22",          // level 0 — empty
        `${colors.success}30`, // level 1 — faint
        `${colors.success}60`, // level 2 — medium
        `${colors.success}90`, // level 3 — strong
        colors.success,        // level 4 — full
      ]
    : [
        colors.track,
        colors.successSoft,
        colors.success,
        colors.success,
        colors.success,
      ];

  return (
    <View style={{ gap: 10 }}>
      <View style={styles.between}>
        {(
          language === "tr"
            ? ["Nis", "May", "Haz", "Tem", "Ağu", "Eyl"]
            : ["Apr", "May", "Jun", "Jul", "Aug", "Sep"]
        ).map((month) => (
          <Label secondary key={month} style={[styles.caption, { fontSize: 11 }]}>
            {month}
          </Label>
        ))}
      </View>
      <View
        accessible
        accessibilityLabel={t("sixMonthHeatmap")}
        style={{ flexDirection: "row", gap: 3 }}
      >
        {Array.from(
          { length: Math.ceil(days.length / 7) },
          (_, week) => (
            <View key={week} style={{ flex: 1, gap: 3 }}>
              {days.slice(week * 7, week * 7 + 7).map((day) => (
                <View
                  key={day.date}
                  style={{
                    aspectRatio: 1,
                    borderRadius: 3,
                    backgroundColor: shades[day.level],
                  }}
                />
              ))}
            </View>
          )
        )}
      </View>
      <View style={[styles.row, { justifyContent: "flex-end", gap: 5 }]}>
        <Label secondary style={[styles.caption, { fontSize: 11 }]}>
          {t("less")}
        </Label>
        {[0, 1, 2, 3, 4].map((level) => (
          <View
            key={level}
            style={{
              width: 10,
              height: 10,
              borderRadius: 3,
              backgroundColor: shades[level],
            }}
          />
        ))}
        <Label secondary style={[styles.caption, { fontSize: 11 }]}>
          {t("more")}
        </Label>
      </View>
    </View>
  );
}
