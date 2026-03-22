import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { insertAccount, updateAccount, deleteAccount } from '../../src/db/queries/netWorth';

const ACCOUNT_TYPES = [
  { value: 'checking',   label: 'Checking',   icon: '🏦' },
  { value: 'savings',    label: 'Savings',    icon: '💰' },
  { value: 'credit',     label: 'Credit',     icon: '💳' },
  { value: 'investment', label: 'Investment', icon: '📈' },
];

export default function AddAccountModal() {
  const { id, accountName, accountInstitution, accountType, accountBalance } =
    useLocalSearchParams<{
      id?: string;
      accountName?: string;
      accountInstitution?: string;
      accountType?: string;
      accountBalance?: string;
    }>();

  const [name, setName] = useState(accountName ?? '');
  const [institution, setInstitution] = useState(accountInstitution ?? '');
  const [type, setType] = useState(accountType ?? 'checking');
  const [balance, setBalance] = useState(accountBalance ?? '0');

  async function handleSave() {
    if (!name.trim()) { Alert.alert('Name required'); return; }
    const bal = parseFloat(balance) || 0;
    const now = Math.floor(Date.now() / 1000);
    const data = {
      name: name.trim(),
      institutionName: institution.trim() || null,
      type,
      currentBalance: bal,
      isManual: 1 as const,
      isActive: 1 as const,
      lastUpdated: now,
    };
    if (id) {
      await updateAccount(parseInt(id), data);
    } else {
      await insertAccount(data);
    }
    router.back();
  }

  async function handleDelete() {
    Alert.alert('Remove Account', `Remove "${name}" from net worth?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => { await deleteAccount(parseInt(id!)); router.back(); },
      },
    ]);
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.section}>
        <Text style={styles.label}>Account Name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName}
          placeholder="e.g. Schwab Checking" placeholderTextColor="#C7C7CC" returnKeyType="next" />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Institution (optional)</Text>
        <TextInput style={styles.input} value={institution} onChangeText={setInstitution}
          placeholder="e.g. Charles Schwab" placeholderTextColor="#C7C7CC" returnKeyType="next" />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Type</Text>
        <View style={styles.typeRow}>
          {ACCOUNT_TYPES.map((t) => (
            <TouchableOpacity
              key={t.value}
              style={[styles.typeChip, type === t.value && styles.typeChipActive]}
              onPress={() => setType(t.value)}
            >
              <Text style={styles.typeEmoji}>{t.icon}</Text>
              <Text style={[styles.typeLabel, type === t.value && styles.typeLabelActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Current Balance</Text>
        <View style={styles.amountRow}>
          <Text style={styles.dollar}>$</Text>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={balance}
            onChangeText={setBalance}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#C7C7CC"
          />
        </View>
        <Text style={styles.hint}>Credit accounts: enter your current balance (positive number)</Text>
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>{id ? 'Save Changes' : 'Add Account'}</Text>
      </TouchableOpacity>

      {id && (
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>Remove Account</Text>
        </TouchableOpacity>
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  section: {
    backgroundColor: '#fff', marginTop: 16, paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5EA', gap: 8,
  },
  label: { fontSize: 13, fontWeight: '600', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { fontSize: 16, color: '#000', paddingVertical: 4 },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dollar: { fontSize: 18, color: '#000' },
  hint: { fontSize: 12, color: '#C7C7CC' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: '#E5E5EA', backgroundColor: '#F9F9F9',
  },
  typeChipActive: { borderColor: '#4F9DDE', backgroundColor: '#4F9DDE15' },
  typeEmoji: { fontSize: 16 },
  typeLabel: { fontSize: 14, color: '#8E8E93' },
  typeLabelActive: { color: '#4F9DDE', fontWeight: '600' },
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
