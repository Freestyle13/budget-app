import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DonutChart } from '../../src/components/charts/DonutChart';
import { BarChart } from '../../src/components/charts/BarChart';
import { useCategoryStore } from '../../src/stores/useCategoryStore';
import { getTransactionsByMonth } from '../../src/db/queries/transactions';
import { getAllSavings } from '../../src/db/queries/savings';
import { getAllAccounts } from '../../src/db/queries/netWorth';
import { formatCurrency } from '../../src/utils/currency';
import { formatMonth, prevMonth, currentMonth } from '../../src/utils/dateHelpers';
import type { Transaction, NetWorthAccount } from '../../src/db/schema';

type ViewMode = 'month' | 'year' | '2year' | 'networth';

export default function ReportsScreen() {
  const { categories, fetchCategories } = useCategoryStore();
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allMonthData, setAllMonthData] = useState<Map<string, Transaction[]>>(new Map());
  const [savings, setSavings] = useState<Array<{ month: string; categoryId: number; savedAmount: number }>>([]);
  const [accounts, setAccounts] = useState<NetWorthAccount[]>([]);
  const [loading, setLoading] = useState(true);

  // Re-load when screen gains focus
  useFocusEffect(
    useCallback(() => {
      fetchCategories();
      loadData();
    }, [])
  );

  // Also re-load when month or view mode changes while on the screen
  useEffect(() => {
    loadData();
  }, [selectedMonth, viewMode]);

  async function loadData() {
    setLoading(true);
    try {
      if (viewMode === 'month') {
        setTransactions(await getTransactionsByMonth(selectedMonth));
      } else if (viewMode === 'year' || viewMode === '2year') {
        const months = getMonthRange(viewMode);
        const results = await Promise.all(months.map((m) => getTransactionsByMonth(m)));
        const map = new Map<string, Transaction[]>();
        months.forEach((m, i) => map.set(m, results[i]));
        setAllMonthData(map);
      } else {
        const [accts, savingsData] = await Promise.all([getAllAccounts(), getAllSavings()]);
        setAccounts(accts);
        setSavings(savingsData);
      }
    } finally {
      setLoading(false);
    }
  }

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const categorySpend = useMemo(() => {
    const map = new Map<number, number>();
    for (const tx of transactions) {
      if (tx.type !== 'expense' || tx.categoryId == null) continue;
      map.set(tx.categoryId, (map.get(tx.categoryId) ?? 0) + tx.amount);
    }
    return Array.from(map.entries())
      .map(([id, amount]) => ({ id, amount, category: categoryMap.get(id) }))
      .filter((x) => x.category)
      .sort((a, b) => b.amount - a.amount);
  }, [transactions, categoryMap]);

  const totalExpenses = categorySpend.reduce((s, x) => s + x.amount, 0);
  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);

  const barData = useMemo(() => {
    const months = getMonthRange(viewMode === '2year' ? '2year' : 'year');
    return months.map((m) => {
      const txs = allMonthData.get(m) ?? [];
      return {
        label: m.slice(5),
        income: txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
        expenses: txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
      };
    });
  }, [allMonthData, viewMode]);

  const barTotals = useMemo(() => ({
    income: barData.reduce((s, d) => s + d.income, 0),
    expenses: barData.reduce((s, d) => s + d.expenses, 0),
  }), [barData]);

  const netWorth = useMemo(() =>
    accounts.reduce((s, a) => s + (a.type === 'credit' ? -a.currentBalance : a.currentBalance), 0),
    [accounts]
  );

  const totalSaved = savings.reduce((s, e) => s + e.savedAmount, 0);

  const VIEW_TABS: Array<{ key: ViewMode; label: string }> = [
    { key: 'month', label: 'Month' },
    { key: 'year', label: 'Year' },
    { key: '2year', label: '2 Year' },
    { key: 'networth', label: 'Net Worth' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.modeTabs}>
        {VIEW_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.modeTab, viewMode === tab.key && styles.modeTabActive]}
            onPress={() => setViewMode(tab.key)}
          >
            <Text style={[styles.modeTabText, viewMode === tab.key && styles.modeTabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color="#4F9DDE" />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* MONTH */}
          {viewMode === 'month' && (
            <>
              <View style={styles.monthBar}>
                <TouchableOpacity onPress={() => setSelectedMonth(prevMonth(selectedMonth))}>
                  <Ionicons name="chevron-back" size={22} color="#4F9DDE" />
                </TouchableOpacity>
                <Text style={styles.monthLabel}>{formatMonth(selectedMonth)}</Text>
                <TouchableOpacity onPress={() => setSelectedMonth(nextMonthStr(selectedMonth))}>
                  <Ionicons name="chevron-forward" size={22} color="#4F9DDE" />
                </TouchableOpacity>
              </View>

              <View style={styles.summaryRow}>
                <SummaryCard label="Income" amount={totalIncome} color="#34C759" />
                <SummaryCard label="Spent" amount={totalExpenses} color="#FF3B30" />
                <SummaryCard label="Net" amount={totalIncome - totalExpenses}
                  color={totalIncome - totalExpenses >= 0 ? '#34C759' : '#FF3B30'} />
              </View>

              {categorySpend.length > 0 ? (
                <>
                  <SectionTitle title="Spending by Category" />
                  <View style={styles.chartCard}>
                    <DonutChart
                      data={categorySpend.map((x) => ({
                        value: x.amount,
                        color: x.category!.color,
                        label: x.category!.name,
                      }))}
                      centerLabel={formatCurrency(totalExpenses)}
                      centerSubLabel="total spent"
                    />
                  </View>

                  <SectionTitle title="Breakdown" />
                  <View style={styles.card}>
                    {categorySpend.map((item, i) => (
                      <View key={item.id}
                        style={[styles.row, i < categorySpend.length - 1 && styles.rowBorder]}>
                        <View style={[styles.dot, { backgroundColor: item.category!.color }]} />
                        <Text style={styles.rowName}>{item.category!.name}</Text>
                        <Text style={styles.rowPct}>
                          {totalExpenses > 0 ? Math.round((item.amount / totalExpenses) * 100) : 0}%
                        </Text>
                        <Text style={styles.rowAmount}>{formatCurrency(item.amount)}</Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : (
                <EmptyChart message="No expense data this month" />
              )}
            </>
          )}

          {/* YEAR / 2-YEAR */}
          {(viewMode === 'year' || viewMode === '2year') && (
            <>
              <View style={styles.summaryRow}>
                <SummaryCard label="Total Income" amount={barTotals.income} color="#34C759" />
                <SummaryCard label="Total Spent" amount={barTotals.expenses} color="#FF3B30" />
                <SummaryCard label="Saved" amount={barTotals.income - barTotals.expenses}
                  color={barTotals.income - barTotals.expenses >= 0 ? '#34C759' : '#FF3B30'} />
              </View>

              <SectionTitle title="Income vs Expenses" />
              <View style={styles.chartCard}>
                <BarChart data={barData} />
                <View style={styles.legend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.dot, { backgroundColor: '#34C759' }]} />
                    <Text style={styles.legendText}>Income</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.dot, { backgroundColor: '#FF3B30' }]} />
                    <Text style={styles.legendText}>Expenses</Text>
                  </View>
                </View>
              </View>
            </>
          )}

          {/* NET WORTH */}
          {viewMode === 'networth' && (
            <>
              <View style={[styles.netWorthHero, { backgroundColor: netWorth >= 0 ? '#34C75912' : '#FF3B3012' }]}>
                <Text style={styles.nwLabel}>Net Worth</Text>
                <Text style={[styles.nwAmount, { color: netWorth >= 0 ? '#34C759' : '#FF3B30' }]}>
                  {formatCurrency(netWorth)}
                </Text>
                {totalSaved > 0 && (
                  <Text style={styles.nwSub}>
                    {formatCurrency(totalSaved)} saved from budgets
                  </Text>
                )}
              </View>

              <SectionTitle title="Accounts" />
              <View style={styles.card}>
                {accounts.length === 0 ? (
                  <View style={styles.emptyRow}>
                    <Text style={styles.emptyRowText}>No accounts — add them in Settings</Text>
                  </View>
                ) : (
                  accounts.map((acct, i) => (
                    <TouchableOpacity
                      key={acct.id}
                      style={[styles.row, i < accounts.length - 1 && styles.rowBorder]}
                      onPress={() =>
                        router.push({
                          pathname: '/modals/add-account',
                          params: {
                            id: acct.id.toString(),
                            accountName: acct.name,
                            accountInstitution: acct.institutionName ?? '',
                            accountType: acct.type,
                            accountBalance: acct.currentBalance.toString(),
                          },
                        })
                      }
                    >
                      <Text style={styles.acctEmoji}>{acctEmoji(acct.type)}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowName}>{acct.name}</Text>
                        {acct.institutionName ? (
                          <Text style={styles.rowSub}>{acct.institutionName}</Text>
                        ) : null}
                      </View>
                      <Text style={[styles.rowAmount, acct.type === 'credit' && { color: '#FF3B30' }]}>
                        {acct.type === 'credit' ? '-' : ''}{formatCurrency(acct.currentBalance)}
                      </Text>
                      <Ionicons name="chevron-forward" size={14} color="#C7C7CC" />
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function SummaryCard({ label, amount, color }: { label: string; amount: number; color: string }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryAmount, { color }]}>{formatCurrency(amount)}</Text>
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function EmptyChart({ message }: { message: string }) {
  return (
    <View style={styles.emptyChart}>
      <Ionicons name="bar-chart-outline" size={48} color="#C7C7CC" />
      <Text style={styles.emptyChartText}>{message}</Text>
    </View>
  );
}

function getMonthRange(mode: ViewMode | 'year' | '2year'): string[] {
  const months: string[] = [];
  const now = new Date();
  const count = mode === '2year' ? 24 : 12;
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

function nextMonthStr(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function acctEmoji(type: string): string {
  return { checking: '🏦', savings: '💰', credit: '💳', investment: '📈' }[type] ?? '🏦';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  modeTabs: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E5EA',
  },
  modeTab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  modeTabActive: { borderBottomWidth: 2, borderBottomColor: '#4F9DDE' },
  modeTabText: { fontSize: 14, color: '#8E8E93' },
  modeTabTextActive: { color: '#4F9DDE', fontWeight: '600' },
  scroll: { paddingBottom: 40 },
  monthBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E5EA',
  },
  monthLabel: { fontSize: 17, fontWeight: '600' },
  summaryRow: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 0 },
  summaryCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, gap: 4,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },
  summaryLabel: { fontSize: 10, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.3 },
  summaryAmount: { fontSize: 13, fontWeight: '700' },
  sectionTitle: {
    fontSize: 13, fontWeight: '600', color: '#8E8E93',
    textTransform: 'uppercase', letterSpacing: 0.5,
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8,
  },
  chartCard: {
    backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 12,
    alignItems: 'center', paddingVertical: 16, paddingHorizontal: 8,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },
  legend: { flexDirection: 'row', gap: 20, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendText: { fontSize: 13, color: '#8E8E93' },
  card: {
    backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 12,
    overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: '#E5E5EA',
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 10,
  },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E5EA' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  rowName: { flex: 1, fontSize: 15, color: '#000' },
  rowSub: { fontSize: 12, color: '#8E8E93' },
  rowPct: { fontSize: 13, color: '#8E8E93', width: 38, textAlign: 'right' },
  rowAmount: { fontSize: 15, fontWeight: '600', color: '#000' },
  emptyChart: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyChartText: { color: '#8E8E93', fontSize: 16 },
  emptyRow: { paddingHorizontal: 16, paddingVertical: 16 },
  emptyRowText: { color: '#C7C7CC', fontSize: 15 },
  netWorthHero: {
    margin: 16, borderRadius: 16, padding: 28, alignItems: 'center', gap: 6,
  },
  nwLabel: { fontSize: 13, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.5 },
  nwAmount: { fontSize: 44, fontWeight: '700', letterSpacing: -1 },
  nwSub: { fontSize: 13, color: '#8E8E93', marginTop: 4 },
  acctEmoji: { fontSize: 20 },
});
