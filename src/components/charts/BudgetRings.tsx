import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

interface RingData {
  label: string;
  color: string;
  percentage: number; // 0–100+, capped visually at 100
  spent: number;
  limit: number;
}

interface Props {
  rings: RingData[];
  size?: number;
}

const RING_GAP = 10;
const STROKE_WIDTH = 14;

export function BudgetRings({ rings, size = 220 }: Props) {
  const center = size / 2;
  // Outermost ring is index 0
  const maxRings = Math.min(rings.length, 6);
  const displayRings = rings.slice(0, maxRings);

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        {displayRings.map((ring, i) => {
          const radius = center - STROKE_WIDTH / 2 - i * (STROKE_WIDTH + RING_GAP);
          if (radius < 10) return null;

          const circumference = 2 * Math.PI * radius;
          const fillPct = Math.min(ring.percentage, 100) / 100;
          const dash = fillPct * circumference;
          const gap = circumference - dash;
          // Start from 12 o'clock
          const startOffset = circumference / 4;

          const isOver = ring.percentage > 100;

          return (
            <G key={i}>
              {/* Track */}
              <Circle
                cx={center} cy={center} r={radius}
                fill="none"
                stroke={ring.color + '25'}
                strokeWidth={STROKE_WIDTH}
              />
              {/* Fill */}
              <Circle
                cx={center} cy={center} r={radius}
                fill="none"
                stroke={isOver ? '#FF3B30' : ring.color}
                strokeWidth={STROKE_WIDTH}
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={startOffset}
                strokeLinecap="round"
              />
            </G>
          );
        })}
      </Svg>

      {/* Legend */}
      <View style={styles.legend}>
        {displayRings.map((ring, i) => (
          <View key={i} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: ring.percentage > 100 ? '#FF3B30' : ring.color }]} />
            <Text style={styles.legendLabel} numberOfLines={1}>{ring.label}</Text>
            <Text style={[styles.legendPct, { color: ring.percentage > 100 ? '#FF3B30' : ring.percentage >= 80 ? '#FF9500' : '#8E8E93' }]}>
              {Math.round(ring.percentage)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 16 },
  legend: { width: '100%', gap: 6, paddingHorizontal: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { flex: 1, fontSize: 13, color: '#000' },
  legendPct: { fontSize: 13, fontWeight: '600' },
});
