import { View, Text, StyleSheet } from 'react-native';

export default function TransactionDetailModal() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>Transaction Detail — coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  placeholder: { color: '#8E8E93', fontSize: 16 },
});
