import { Text, VStack } from "@expo/ui/swift-ui";
import { font, foregroundStyle } from "@expo/ui/swift-ui/modifiers";
import { createWidget } from "expo-widgets";

export type DailyProgressWidgetProps = {
  completed: number;
  total: number;
  percentage: number;
  label: string;
};

const DailyProgressWidget = (props: DailyProgressWidgetProps) => {
  "widget";
  return (
    <VStack>
      <Text modifiers={[font({ weight: "semibold", size: 14 }), foregroundStyle("#173B2D")]}>Today</Text>
      <Text modifiers={[font({ weight: "bold", size: 30 }), foregroundStyle("#173B2D")]}> {props.percentage}%</Text>
      <Text modifiers={[font({ size: 13 }), foregroundStyle("#52635B")]}> {props.completed} of {props.total} habits</Text>
    </VStack>
  );
};

export default createWidget<DailyProgressWidgetProps>("DailyProgressWidget", DailyProgressWidget);
