import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G, Text as SvgText } from 'react-native-svg';

interface Slice {
  value: number;
  color: string;
  label: string;
}

interface Props {
  data: Slice[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerSubLabel?: string;
}

export function DonutChart({ data, size = 200, strokeWidth = 32, centerLabel, centerSubLabel }: Props) {
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;

  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  let offset = 0;
  // Start from top (-circumference / 4 rotates to 12 o'clock)
  const startOffset = circumference / 4;

  const slices = data.map((slice) => {
    const pct = slice.value / total;
    const dash = pct * circumference;
    const gap = circumference - dash;
    const currentOffset = startOffset - offset;
    offset += dash;
    return { ...slice, dash, gap, strokeDashoffset: currentOffset };
  });

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        {/* Track */}
        <Circle
          cx={cx} cy={cy} r={radius}
          fill="none" stroke="#F2F2F7"
          strokeWidth={strokeWidth}
        />
        {slices.map((slice, i) => (
          <Circle
            key={i}
            cx={cx} cy={cy} r={radius}
            fill="none"
            stroke={slice.color}
            strokeWidth={strokeWidth - 2}
            strokeDasharray={`${slice.dash} ${slice.gap}`}
            strokeDashoffset={slice.strokeDashoffset}
            strokeLinecap="butt"
          />
        ))}
        {centerLabel && (
          <>
            <SvgText
              x={cx} y={cy - 8}
              textAnchor="middle" fontSize={18} fontWeight="bold" fill="#000"
            >
              {centerLabel}
            </SvgText>
            {centerSubLabel && (
              <SvgText
                x={cx} y={cy + 14}
                textAnchor="middle" fontSize={11} fill="#8E8E93"
              >
                {centerSubLabel}
              </SvgText>
            )}
          </>
        )}
      </Svg>
    </View>
  );
}
