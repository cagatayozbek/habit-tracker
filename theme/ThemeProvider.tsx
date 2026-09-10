import {
  createContext,
  useContext,
  useState,
  type PropsWithChildren,
} from "react";
import { useColorScheme } from "react-native";
import { palettes } from "./tokens";

type Appearance = "system" | "light" | "dark";
const ThemeContext = createContext<{
  appearance: Appearance;
  setAppearance: (value: Appearance) => void;
  dark: boolean;
  colors: typeof palettes.light;
} | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const system = useColorScheme();
  const [appearance, setAppearance] = useState<Appearance>("system");
  const dark = (appearance === "system" ? system : appearance) === "dark";
  return (
    <ThemeContext.Provider
      value={{
        appearance,
        setAppearance,
        dark,
        colors: dark ? palettes.dark : palettes.light,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
export function useTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error("useTheme requires ThemeProvider");
  return theme;
}
