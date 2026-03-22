import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  icon: string;
  color: string;
  size?: number;
}

export function CategoryIcon({ icon, color, size = 20 }: Props) {
  return (
    <View style={[styles.container, { backgroundColor: color + '22', width: size + 16, height: size + 16, borderRadius: (size + 16) / 2 }]}>
      <Ionicons name={icon as any} size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
