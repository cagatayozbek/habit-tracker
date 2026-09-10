import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
export function selectionHaptic() {
  if (Platform.OS === "ios") void Haptics.selectionAsync().catch(() => {});
}
