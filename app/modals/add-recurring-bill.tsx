import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Alert, Switch,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCategoryStore } from '../../src/stores/useCategoryStore';
import {
  insertRecurringBill,
  updateRecurringBill,
  deleteRecurringBill,
} from '../../src/db/queries/recurringBills';
import { CategoryIcon } from '../../src/components/common/CategoryIcon';

interface Props {}

export default function AddRecurringBillModal() {
  const { id, billName, billAmount, billCategoryId, billDay, billActive } =
    useLocalSearchParams<{
      id?: string;
      billName?: string;
      billAmount?: string;
      billCategoryId?: string;
      billDay?: string;
      billActive?: string;
    }>();

  const { categories, fetchCategories } = useCategoryStore();

  const [name, setName] = useState(billName ?? '');
  const [amount, setAmount] = useState(billAmount ?? '');
  const [categoryId, setCategoryId] = useState<number | null>(
    billCategoryId ? parseInt(billCategoryId) : null
  );
  const [dayOfMonth, setDayOfMonth] = useState(billDay ?? '1');
  const [isActive, setIsActive] = useState(billActive !== '0');

  useEffect(() => { fetchCategories(); }, []);

  async function handleSave() {
    if (!name.trim()) { Alert.alert('Name required'); return; }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { Alert.alert('Enter a valid amount'); return; }
    const day = Math.min(Math.max(parseInt(dayOfMonth) || 1, 1), 28);

    if (id) {
      // Don't touch lastPostedMonth when editing — preserve it
      await updateRecurringBill(parseInt(id), {
        name: name.trim(),
        amount: amt,
        categoryId,
        dayOfMonth: day,
        isActive: isActive ? 1 : 0,
      });
    } else {
      await insertRecurringBill({
        name: name.trim(),
        amount: amt,
        categoryId,
        dayOfMonth: day,
        isActive: isActive ? 1 : 0,
        lastPostedMonth: null,
      });
    }
    router.back();
  }

  async function handleDelete() {
    Alert.alert('Delete Bill', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => { await deleteRecurringBill(parseInt(id!)); router.back(); },
      },
    ]);
  }

  const expenseCategories = categories.filter((c) => !c.isIncome);

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.section}>
        <Text style={styles.label}>Bill Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Netflix, Rent, Internet"
          placeholderTextColor="#C7C7CC"
          returnKeyType="next"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Amount</Text>
        <View style={styles.amountRow}>
          <Text style={styles.dollar}>$</Text>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#C7C7CC"
            returnKeyType="next"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Day of Month</Text>
        <TextInput
          style={styles.input}
          value={dayOfMonth}
          onChangeText={setDayOfMonth}
          keyboardType="number-pad"
          placeholder="1–28"
          placeholderTextColor="#C7C7CC"
          returnKeyType="done"
        />
        <Text style={styles.hint}>Bill auto-posts on this day each month (max 28)</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.switchRow}>
          <Text style={styles.label}>Active</Text>
          <Switch value={isActive} onValueChange={setIsActive} trackColor={{ true: '#34C759' }} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Category</Text>
        <View style={styles.catGrid}>
          {expenseCategories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.catChip,
                categoryId === cat.id && { borderColor: cat.color, backgroundColor: cat.color + '15' },
              ]}
              onPress={() => setCategoryId(cat.id === categoryId ? null : cat.id)}
            >
              <CategoryIcon icon={cat.icon} color={cat.color} size={14} />
              <Text style={[styles.catChipText, categoryId === cat.id && { color: cat.color }]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>{id ? 'Save Changes' : 'Add Bill'}</Text>
      </TouchableOpacity>

      {id && (
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>Delete Bill</Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5EA',
    gap: 8,
  },
  label: { fontSize: 13, fontWeight: '600', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { fontSize: 16, color: '#000', paddingVertical: 4 },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dollar: { fontSize: 18, color: '#000' },
  hint: { fontSize: 12, color: '#C7C7CC' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: '#E5E5EA',
    backgroundColor: '#fff',
  },
  catChipText: { fontSize: 13, color: '#8E8E93' },
  saveButton: {
    margin: 16, backgroundColor: '#4F9DDE',
    borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  saveButtonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  deleteButton: {
    marginHorizontal: 16, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', backgroundColor: '#fff',
    borderWidth: StyleSheet.hairlineWidth, borderColor: '#FF3B30',
  },
  deleteButtonText: { color: '#FF3B30', fontSize: 17, fontWeight: '600' },
});
