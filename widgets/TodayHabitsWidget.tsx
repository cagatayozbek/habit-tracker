import { Button, Text, VStack } from "@expo/ui/swift-ui";
import { font, foregroundStyle } from "@expo/ui/swift-ui/modifiers";
import { createWidget } from "expo-widgets";

export type TodayWidgetHabit = { id: string; name: string; completed: boolean };
export type TodayHabitsWidgetProps = { habits: TodayWidgetHabit[] };

const TodayHabitsWidget = (props: TodayHabitsWidgetProps) => {
  "widget";
  return <VStack spacing={8}>
    <Text modifiers={[font({ weight: "bold", size: 15 }), foregroundStyle("#173B2D")]}>Today</Text>
    {(props.habits ?? []).slice(0, 4).map((habit) => <Button key={habit.id} target={`toggle:${habit.id}`} label={`${habit.completed ? "✓" : "○"} ${habit.name}`} onPress={() => {}} />)}
  </VStack>;
};

export default createWidget<TodayHabitsWidgetProps>("TodayHabitsWidget", TodayHabitsWidget);
