import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Svg, { Rect, Line, Text as SvgText, G } from 'react-native-svg';

interface DataPoint {
  label: string;
  income: number;
  expenses: number;
}

interface Props {
  data: DataPoint[];
  height?: number;
}

export function BarChart({ data, height = 180 }: Props) {
  if (data.length === 0) return null;

  const maxVal = Math.max(...data.flatMap((d) => [d.income, d.expenses]), 1);
  const barWidth = 8;
  const gap = 4;
  const groupWidth = barWidth * 2 + gap + 16;
  const chartWidth = Math.max(data.length * groupWidth + 20, 300);
  const chartHeight = height;
  const topPad = 10;
  const bottomPad = 28;
  const plotH = chartHeight - topPad - bottomPad;

  function barHeight(val: number) {
    return Math.max((val / maxVal) * plotH, val > 0 ? 2 : 0);
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <Svg width={chartWidth} height={chartHeight}>
        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const y = topPad + plotH * (1 - pct);
          return (
            <Line key={pct} x1={0} x2={chartWidth} y1={y} y2={y}
              stroke="#E5E5EA" strokeWidth={0.5} />
          );
        })}

        {data.map((d, i) => {
          const x = i * groupWidth + 10;
          const incH = barHeight(d.income);
          const expH = barHeight(d.expenses);
          const incY = topPad + plotH - incH;
          const expY = topPad + plotH - expH;

          return (
            <G key={i}>
              {/* Income bar */}
              <Rect
                x={x} y={incY}
                width={barWidth} height={incH}
                fill="#34C759" rx={2}
              />
              {/* Expense bar */}
              <Rect
                x={x + barWidth + gap} y={expY}
                width={barWidth} height={expH}
                fill="#FF3B30" rx={2}
              />
              {/* Label */}
              <SvgText
                x={x + barWidth + gap / 2}
                y={chartHeight - 6}
                textAnchor="middle"
                fontSize={9}
                fill="#8E8E93"
              >
                {d.label}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </ScrollView>
  );
}
