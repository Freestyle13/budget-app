import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Switch, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllRecurringBills } from '../../src/db/queries/recurringBills';
import { getAllAccounts } from '../../src/db/queries/netWorth';
import { useCategoryStore } from '../../src/stores/useCategoryStore';
import { formatCurrency } from '../../src/utils/currency';
import type { RecurringBill, NetWorthAccount } from '../../src/db/schema';

const REMINDER_KEY = '@budget_reminder_enabled';
const REMINDER_FREQ_KEY = '@budget_reminder_freq';

export default function SettingsScreen() {
  const { categories } = useCategoryStore();
  const [bills, setBills] = useState<RecurringBill[]>([]);
  const [accounts, setAccounts] = useState<NetWorthAccount[]>([]);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderFreq, setReminderFreq] = useState<'daily' | 'weekly'>('weekly');

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    const [billsData, accountsData, reminderVal, freqVal] = await Promise.all([
      getAllRecurringBills(),
      getAllAccounts(),
      AsyncStorage.getItem(REMINDER_KEY),
      AsyncStorage.getItem(REMINDER_FREQ_KEY),
    ]);
    setBills(billsData);
    setAccounts(accountsData);
    setReminderEnabled(reminderVal === 'true');
    if (freqVal === 'daily' || freqVal === 'weekly') setReminderFreq(freqVal);
  }

  async function toggleReminder(value: boolean) {
    setReminderEnabled(value);
    await AsyncStorage.setItem(REMINDER_KEY, value.toString());
  }

  async function setFrequency(freq: 'daily' | 'weekly') {
    setReminderFreq(freq);
    await AsyncStorage.setItem(REMINDER_FREQ_KEY, freq);
  }

  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Recurring Bills */}
        <Text style={styles.sectionHeader}>Recurring Bills</Text>
        <View style={styles.card}>
          {bills.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>No recurring bills yet</Text>
            </View>
          ) : (
            bills.map((bill, i) => {
              const cat = bill.categoryId ? categoryMap.get(bill.categoryId) : null;
              return (
                <TouchableOpacity
                  key={bill.id}
                  style={[styles.row, i < bills.length - 1 && styles.rowBorder]}
                  onPress={() =>
                    router.push({
                      pathname: '/modals/add-recurring-bill',
                      params: {
                        id: bill.id.toString(),
                        billName: bill.name,
                        billAmount: bill.amount.toString(),
                        billCategoryId: bill.categoryId?.toString() ?? '',
                        billDay: bill.dayOfMonth.toString(),
                        billActive: bill.isActive.toString(),
                      },
                    })
                  }
                >
                  <View style={styles.rowLeft}>
                    <Text style={[styles.rowTitle, !bill.isActive && styles.inactive]}>
                      {bill.name}
                    </Text>
                    <Text style={styles.rowSubtitle}>
                      Day {bill.dayOfMonth} · {cat?.name ?? 'Uncategorized'}
                      {!bill.isActive ? ' · Paused' : ''}
                    </Text>
                  </View>
                  <Text style={styles.rowAmount}>{formatCurrency(bill.amount)}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
                </TouchableOpacity>
              );
            })
          )}
          <TouchableOpacity
            style={[styles.row, bills.length > 0 && styles.rowBorderTop]}
            onPress={() => router.push('/modals/add-recurring-bill')}
          >
            <Ionicons name="add-circle-outline" size={20} color="#4F9DDE" />
            <Text style={styles.addText}>Add Recurring Bill</Text>
          </TouchableOpacity>
        </View>

        {/* Net Worth Accounts */}
        <Text style={styles.sectionHeader}>Net Worth Accounts</Text>
        <View style={styles.card}>
          {accounts.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>No accounts yet</Text>
            </View>
          ) : (
            accounts.map((account, i) => (
              <TouchableOpacity
                key={account.id}
                style={[styles.row, i < accounts.length - 1 && styles.rowBorder]}
                onPress={() =>
                  router.push({
                    pathname: '/modals/add-account',
                    params: {
                      id: account.id.toString(),
                      accountName: account.name,
                      accountInstitution: account.institutionName ?? '',
                      accountType: account.type,
                      accountBalance: account.currentBalance.toString(),
                    },
                  })
                }
              >
                <View style={styles.rowLeft}>
                  <Text style={styles.rowTitle}>{account.name}</Text>
                  <Text style={styles.rowSubtitle}>
                    {account.institutionName ?? account.type}
                  </Text>
                </View>
                <Text style={[
                  styles.rowAmount,
                  account.type === 'credit' && { color: '#FF3B30' },
                ]}>
                  {account.type === 'credit' ? '-' : ''}{formatCurrency(account.currentBalance)}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
              </TouchableOpacity>
            ))
          )}
          <TouchableOpacity
            style={[styles.row, accounts.length > 0 && styles.rowBorderTop]}
            onPress={() => router.push('/modals/add-account')}
          >
            <Ionicons name="add-circle-outline" size={20} color="#4F9DDE" />
            <Text style={styles.addText}>Add Account</Text>
          </TouchableOpacity>
        </View>

        {/* Reminders */}
        <Text style={styles.sectionHeader}>Reminders</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Budget Reminder</Text>
              <Text style={styles.rowSubtitle}>Nudge to review your spending</Text>
            </View>
            <Switch
              value={reminderEnabled}
              onValueChange={toggleReminder}
              trackColor={{ true: '#34C759' }}
            />
          </View>
          {reminderEnabled && (
            <View style={[styles.row, styles.rowBorderTop]}>
              <Text style={[styles.rowTitle, { flex: 1 }]}>Frequency</Text>
              <View style={styles.freqToggle}>
                {(['daily', 'weekly'] as const).map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.freqChip, reminderFreq === f && styles.freqChipActive]}
                    onPress={() => setFrequency(f)}
                  >
                    <Text style={[styles.freqText, reminderFreq === f && styles.freqTextActive]}>
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* About */}
        <Text style={styles.sectionHeader}>About</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowTitle}>Version</Text>
            <Text style={styles.rowSubtitle}>1.0.0</Text>
          </View>
          <View style={[styles.row, styles.rowBorderTop]}>
            <Text style={styles.rowTitle}>Data Storage</Text>
            <Text style={styles.rowSubtitle}>Local only · Never leaves device</Text>
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  scroll: { paddingBottom: 32 },
  sectionHeader: {
    fontSize: 13, fontWeight: '600', color: '#8E8E93',
    textTransform: 'uppercase', letterSpacing: 0.5,
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 6,
  },
  card: {
    backgroundColor: '#fff', marginHorizontal: 16,
    borderRadius: 12, overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth, borderColor: '#E5E5EA',
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 10,
  },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E5EA' },
  rowBorderTop: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E5EA' },
  rowLeft: { flex: 1 },
  rowTitle: { fontSize: 16, color: '#000' },
  rowSubtitle: { fontSize: 13, color: '#8E8E93', marginTop: 1 },
  rowAmount: { fontSize: 15, fontWeight: '600', color: '#000' },
  inactive: { color: '#C7C7CC' },
  addText: { fontSize: 16, color: '#4F9DDE' },
  emptyRow: { paddingHorizontal: 16, paddingVertical: 14 },
  emptyText: { color: '#C7C7CC', fontSize: 15 },
  freqToggle: { flexDirection: 'row', gap: 6 },
  freqChip: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 14, backgroundColor: '#E5E5EA',
  },
  freqChipActive: { backgroundColor: '#4F9DDE' },
  freqText: { fontSize: 14, color: '#8E8E93' },
  freqTextActive: { color: '#fff', fontWeight: '600' },
});
