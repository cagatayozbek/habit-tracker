import { HStack, RoundedRectangle, Text, VStack } from "@expo/ui/swift-ui";
import { font, foregroundStyle, frame } from "@expo/ui/swift-ui/modifiers";
import { createWidget } from "expo-widgets";

export type ConsistencyHeatmapWidgetProps = { levels: number[]; percentage: number };

const ConsistencyHeatmapWidget = (props: ConsistencyHeatmapWidgetProps) => {
  "widget";
  const levels = props.levels ?? [];
  return <VStack>
    <Text modifiers={[font({ weight: "bold", size: 16 }), foregroundStyle("#173B2D")]}>Az alma sık.</Text>
    <HStack spacing={20}>
      {['Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl'].map((month) => <Text key={month} modifiers={[font({ size: 9 }), foregroundStyle("#68776F")]}>{month}</Text>)}
    </HStack>
    <VStack spacing={3}>
      {[0, 1, 2, 3, 4, 5, 6].map((row) => <HStack key={row} spacing={3}>
        {Array.from({ length: 26 }, (_, column) => <RoundedRectangle key={column} cornerRadius={2} modifiers={[frame({ width: 8, height: 8 }), foregroundStyle(["#E7EDE8", "#D4E1D8", "#AEC8B7", "#78A18A", "#32694F"][levels[row * 26 + column] ?? 0])]} />)}
      </HStack>)}
    </VStack>
    <HStack spacing={4}>
      <Text modifiers={[font({ size: 9 }), foregroundStyle("#68776F")]}>Az</Text>
      {[0, 1, 2, 3, 4].map((level) => <RoundedRectangle key={level} cornerRadius={2} modifiers={[frame({ width: 8, height: 8 }), foregroundStyle(["#E7EDE8", "#D4E1D8", "#AEC8B7", "#78A18A", "#32694F"][level])]} />)}
      <Text modifiers={[font({ size: 9 }), foregroundStyle("#68776F")]}>Çok · {props.percentage}%</Text>
    </HStack>
  </VStack>;
};

export default createWidget<ConsistencyHeatmapWidgetProps>("ConsistencyHeatmapWidget", ConsistencyHeatmapWidget);
