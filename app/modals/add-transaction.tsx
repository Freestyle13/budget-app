import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCategoryStore } from '../../src/stores/useCategoryStore';
import { useTransactionStore } from '../../src/stores/useTransactionStore';
import { getTransactionById } from '../../src/db/queries/transactions';
import { CategoryIcon } from '../../src/components/common/CategoryIcon';
import { todayTimestamp, formatDate } from '../../src/utils/dateHelpers';
import type { Category, Transaction } from '../../src/db/schema';

type TxType = 'expense' | 'income' | 'transfer';

const NUMPAD_KEYS = ['1','2','3','4','5','6','7','8','9','.','0','⌫'];

export default function AddTransactionModal() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { categories, fetchCategories } = useCategoryStore();
  const { addTransaction, updateTransaction, deleteTransaction } = useTransactionStore();

  const [existing, setExisting] = useState<Transaction | null>(null);
  const [amountStr, setAmountStr] = useState('0');
  const [txType, setTxType] = useState<TxType>('expense');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [merchant, setMerchant] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayTimestamp());

  useEffect(() => {
    fetchCategories();
    if (id) {
      // Fetch directly from DB so we can edit transactions from any month
      getTransactionById(parseInt(id)).then((rows) => {
        const tx = rows[0] ?? null;
        if (tx) {
          setExisting(tx);
          setAmountStr(tx.amount.toFixed(2));
          setTxType(tx.type as TxType);
          setCategoryId(tx.categoryId ?? null);
          setMerchant(tx.merchant ?? '');
          setNote(tx.note ?? '');
          setDate(tx.date);
        }
      });
    }
  }, []);

  function handleNumpad(key: string) {
    if (key === '⌫') {
      setAmountStr((prev) => (prev.length <= 1 ? '0' : prev.slice(0, -1)));
      return;
    }
    if (key === '.' && amountStr.includes('.')) return;
    const dotIndex = amountStr.indexOf('.');
    if (dotIndex !== -1 && amountStr.length - dotIndex > 2) return;
    setAmountStr((prev) => (prev === '0' && key !== '.' ? key : prev + key));
  }

  async function handleSave() {
    const amount = parseFloat(amountStr);
    if (!amount || amount <= 0) {
      Alert.alert('Invalid amount', 'Please enter an amount greater than 0.');
      return;
    }
    const data = {
      amount,
      type: txType,
      categoryId,
      merchant: merchant.trim() || null,
      note: note.trim() || null,
      date,
      isRecurring: 0 as const,
      recurringBillId: existing?.recurringBillId ?? null,
      source: 'manual' as const,
      importHash: null,
    };
    if (existing) {
      await updateTransaction(existing.id, data);
    } else {
      await addTransaction(data);
    }
    router.back();
  }

  async function handleDelete() {
    Alert.alert('Delete Transaction', 'Remove this transaction?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => { await deleteTransaction(existing!.id); router.back(); },
      },
    ]);
  }

  const relevantCategories = categories.filter((c) =>
    txType === 'income' ? c.isIncome === 1 : c.isIncome === 0
  );

  const amountColor = txType === 'income' ? '#34C759' : txType === 'expense' ? '#FF3B30' : '#4F9DDE';

  return (
    <View style={styles.container}>
      {/* Type toggle */}
      <View style={styles.typeRow}>
        {(['expense', 'income', 'transfer'] as TxType[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.typeButton, txType === t && styles.typeButtonActive]}
            onPress={() => { setTxType(t); setCategoryId(null); }}
          >
            <Text style={[styles.typeButtonText, txType === t && styles.typeButtonTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Amount */}
      <View style={styles.amountRow}>
        <Text style={[styles.amountText, { color: amountColor }]}>${amountStr}</Text>
      </View>

      {/* Numpad */}
      <View style={styles.numpad}>
        {NUMPAD_KEYS.map((key) => (
          <TouchableOpacity key={key} style={styles.numKey} onPress={() => handleNumpad(key)}>
            {key === '⌫' ? (
              <Ionicons name="backspace-outline" size={22} color="#000" />
            ) : (
              <Text style={styles.numKeyText}>{key}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Details */}
      <ScrollView style={styles.details} keyboardShouldPersistTaps="handled">
        {txType !== 'transfer' && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {relevantCategories.map((cat: Category) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catChip, categoryId === cat.id && { borderColor: cat.color, backgroundColor: cat.color + '15' }]}
                  onPress={() => setCategoryId(cat.id === categoryId ? null : cat.id)}
                >
                  <CategoryIcon icon={cat.icon} color={cat.color} size={14} />
                  <Text style={[styles.catChipText, categoryId === cat.id && { color: cat.color }]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.fieldRow}>
          <Ionicons name="storefront-outline" size={18} color="#8E8E93" />
          <TextInput style={styles.fieldInput} value={merchant} onChangeText={setMerchant}
            placeholder="Merchant / Payee" placeholderTextColor="#C7C7CC" returnKeyType="next" />
        </View>

        <View style={styles.fieldRow}>
          <Ionicons name="create-outline" size={18} color="#8E8E93" />
          <TextInput style={styles.fieldInput} value={note} onChangeText={setNote}
            placeholder="Note (optional)" placeholderTextColor="#C7C7CC" returnKeyType="done" />
        </View>

        <View style={styles.fieldRow}>
          <Ionicons name="calendar-outline" size={18} color="#8E8E93" />
          <Text style={styles.dateText}>{formatDate(date)}</Text>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>{existing ? 'Save Changes' : 'Add Transaction'}</Text>
        </TouchableOpacity>

        {existing && (
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  typeRow: {
    flexDirection: 'row', margin: 16,
    backgroundColor: '#E5E5EA', borderRadius: 10, padding: 2,
  },
  typeButton: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  typeButtonActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } },
  typeButtonText: { fontSize: 15, color: '#8E8E93' },
  typeButtonTextActive: { color: '#000', fontWeight: '600' },
  amountRow: { alignItems: 'center', paddingVertical: 8 },
  amountText: { fontSize: 48, fontWeight: '300', letterSpacing: -1 },
  numpad: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16 },
  numKey: { width: '33.33%', aspectRatio: 2, alignItems: 'center', justifyContent: 'center' },
  numKeyText: { fontSize: 24, color: '#000' },
  details: { flex: 1, marginTop: 8 },
  section: {
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5EA', paddingVertical: 10,
  },
  sectionLabel: {
    fontSize: 12, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.5,
    paddingHorizontal: 16, marginBottom: 6,
  },
  categoryScroll: { paddingHorizontal: 12 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: '#E5E5EA',
    marginHorizontal: 4, backgroundColor: '#fff',
  },
  catChipText: { fontSize: 13, color: '#8E8E93' },
  fieldRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E5EA',
  },
  fieldInput: { flex: 1, fontSize: 16, color: '#000' },
  dateText: { fontSize: 16, color: '#000' },
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
