import { View } from "react-native";
import { Label, styles } from "./ui";

export function HealthSettings() {
  return (
    <View style={{ gap: 14 }}>
      <Label style={styles.heading}>Apple Health</Label>
      <Label secondary style={{ lineHeight: 22 }}>
        Apple Health is available only on iPhone. Manual tracking remains available here.
      </Label>
    </View>
  );
}
