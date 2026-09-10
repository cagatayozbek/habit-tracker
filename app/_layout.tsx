import { DatabaseProvider } from "../db/DatabaseProvider";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider, useTheme } from "../theme/ThemeProvider";
import { LocalizationProvider } from "../lib/i18n";
export default function RootLayout() {
  return (
    <LocalizationProvider>
      <ThemeProvider>
        <DatabaseProvider>
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
