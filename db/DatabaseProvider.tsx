import { type PropsWithChildren, useState } from "react";
import { Pressable, View } from "react-native";
import { SQLiteProvider } from "expo-sqlite";
import { migrateDatabase } from "./migrations";
import { Label } from "../components/ui";
import { useTheme } from "../theme/ThemeProvider";
export function DatabaseProvider({ children }: PropsWithChildren) {
  const { colors } = useTheme();
  const [error, setError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {error ? (
        <View
          style={{ flex: 1, justifyContent: "center", padding: 24, gap: 16 }}
        >
          <Label>Couldn’t open your local data.</Label>
          <Label secondary>{error.message}</Label>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setError(null);
              setAttempt((value) => value + 1);
            }}
            style={{ padding: 16 }}
          >
            <Label>Try again</Label>
          </Pressable>
        </View>
      ) : (
        <SQLiteProvider
          key={attempt}
          databaseName="habit-tracker.db"
          onInit={migrateDatabase}
          onError={setError}
        >
          {children}
        </SQLiteProvider>
      )}
    </View>
  );
}
