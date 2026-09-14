import { Button, Text, VStack } from "@expo/ui/swift-ui";
import { font, foregroundStyle } from "@expo/ui/swift-ui/modifiers";
import { createWidget } from "expo-widgets";

export type SingleHabitWidgetProps = { id: string; name: string; value: number; target: number; completed: boolean; type: string };
const SingleHabitWidget = (props: SingleHabitWidgetProps) => {
  "widget";
  return <VStack spacing={7}>
    <Text modifiers={[font({ weight: "bold", size: 15 }), foregroundStyle("#173B2D")]}>{props.name || "Habit"}</Text>
    <Text modifiers={[font({ size: 12 }), foregroundStyle("#52635B")]}>{props.value || 0} / {props.target || 1}</Text>
    <Button target={`${props.type === "check" ? "toggle" : "increment"}:${props.id}`} label={props.completed ? "Completed" : props.type === "check" ? "Complete" : "+1"} onPress={() => {}} />
  </VStack>;
};
export default createWidget<SingleHabitWidgetProps>("SingleHabitWidget", SingleHabitWidget);
