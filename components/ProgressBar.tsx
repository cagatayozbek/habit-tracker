import { useEffect, useState } from "react";
import { Animated, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { useReducedMotion } from "../hooks/useReducedMotion";
export function ProgressBar({ percentage }: { percentage: number }) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const [progress] = useState(() => new Animated.Value(percentage));
  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: percentage,
      duration: reduced ? 0 : 220,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [percentage, progress, reduced]);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: percentage }}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percentage}
      style={{
        height: 7,
        backgroundColor: colors.track,
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <Animated.View
        style={{
          height: "100%",
          backgroundColor: colors.success,
          borderRadius: 8,
          width: progress.interpolate({
            inputRange: [0, 100],
            outputRange: ["0%", "100%"],
          }),
        }}
      />
    </View>
  );
}
