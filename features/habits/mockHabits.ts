import type { ComponentProps } from "react";
import type Ionicons from "@expo/vector-icons/Ionicons";
import { habitColors } from "../../theme/tokens";
export type MockHabit = {
  id: string;
  name: string;
  subtitle: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  color: string;
  streak: number;
  percentage: number;
};
export const mockHabits: MockHabit[] = [
  {
    id: "read",
    name: "Read 20 pages",
    subtitle: "A little room for new ideas",
    icon: "book-outline",
    color: habitColors[0],
    streak: 12,
    percentage: 86,
  },
  {
    id: "walk",
    name: "Take a walk",
    subtitle: "Step outside. Find your pace.",
    icon: "footsteps-outline",
    color: habitColors[1],
    streak: 8,
    percentage: 79,
  },
  {
    id: "pause",
    name: "Mindful moment",
    subtitle: "Five minutes, just for you",
    icon: "leaf-outline",
    color: habitColors[2],
    streak: 6,
    percentage: 93,
  },
  {
    id: "water",
    name: "Stay hydrated",
    subtitle: "Make time for a glass of water",
    icon: "water-outline",
    color: habitColors[3],
    streak: 18,
    percentage: 89,
  },
];
