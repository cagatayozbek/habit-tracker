import { DatabaseProvider } from "../db/DatabaseProvider";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider, useTheme } from "../theme/ThemeProvider";
import { LocalizationProvider } from "../lib/i18n";
import { WatchConnectivityProvider } from "../components/WatchConnectivityProvider";
import { WidgetInteractionProvider } from "../components/WidgetInteractionProvider";
export default function RootLayout() {
  return (
    <LocalizationProvider>
      <ThemeProvider>
        <DatabaseProvider>
          <WatchConnectivityProvider />
          <WidgetInteractionProvider />
          <Navigation />
        </DatabaseProvider>
      </ThemeProvider>
    </LocalizationProvider>
  );
}
function Navigation() {
  const { dark, colors } = useTheme();
  return (
    <>
      <StatusBar style={dark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="settings" options={{ presentation: "modal" }} />
      </Stack>
    </>
  );
}
