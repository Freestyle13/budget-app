import { View, StyleSheet } from 'react-native';

interface Props {
  percentage: number | null;
}

export function BudgetProgressBar({ percentage }: Props) {
  if (percentage === null) return null;

  const clamped = Math.min(percentage, 100);
  const color = percentage >= 100 ? '#FF3B30' : percentage >= 80 ? '#FF9500' : '#34C759';

  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${clamped}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 6,
    backgroundColor: '#E5E5EA',
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});
