import { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTransactionStore } from '../../src/stores/useTransactionStore';
import { useCategoryStore } from '../../src/stores/useCategoryStore';
import { useBudgetStore } from '../../src/stores/useBudgetStore';
import { CategoryIcon } from '../../src/components/common/CategoryIcon';
import { BudgetProgressBar } from '../../src/components/common/BudgetProgressBar';
import { formatCurrency } from '../../src/utils/currency';
import { formatMonth, formatDate, prevMonth, nextMonth } from '../../src/utils/dateHelpers';
import type { Transaction } from '../../src/db/schema';

export default function DashboardScreen() {
  const {
    transactions,
    recentTransactions,
    selectedMonth,
    setSelectedMonth,
    fetchTransactions,
    fetchRecentTransactions,
  } = useTransactionStore();
  const { categories, fetchCategories } = useCategoryStore();
  const { summary, computeSummary } = useBudgetStore();

  useEffect(() => {
    fetchCategories();
    fetchTransactions();
    fetchRecentTransactions();
  }, []);

  useEffect(() => {
    if (categories.length > 0) {
      computeSummary(selectedMonth, categories, transactions);
    }
  }, [categories, transactions, selectedMonth]);

  const { totalIncome, totalExpenses, net } = useMemo(() => {
    let totalIncome = 0;
    let totalExpenses = 0;
    for (const tx of transactions) {
      if (tx.type === 'income') totalIncome += tx.amount;
      else if (tx.type === 'expense') totalExpenses += tx.amount;
    }
    return { totalIncome, totalExpenses, net: totalIncome - totalExpenses };
  }, [transactions]);

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  const budgetSummaryWithLimit = summary.filter((s) => s.limit != null);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Month selector */}
        <View style={styles.monthBar}>
          <TouchableOpacity onPress={() => setSelectedMonth(prevMonth(selectedMonth))}>
            <Ionicons name="chevron-back" size={22} color="#4F9DDE" />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{formatMonth(selectedMonth)}</Text>
          <TouchableOpacity onPress={() => setSelectedMonth(nextMonth(selectedMonth))}>
            <Ionicons name="chevron-forward" size={22} color="#4F9DDE" />
          </TouchableOpacity>
        </View>

        {/* Summary cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, styles.summaryCardGreen]}>
            <Text style={styles.summaryCardLabel}>Income</Text>
            <Text style={[styles.summaryCardAmount, { color: '#34C759' }]}>
              {formatCurrency(totalIncome)}
            </Text>
          </View>
          <View style={[styles.summaryCard, styles.summaryCardRed]}>
            <Text style={styles.summaryCardLabel}>Expenses</Text>
            <Text style={[styles.summaryCardAmount, { color: '#FF3B30' }]}>
              {formatCurrency(totalExpenses)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryCardLabel}>Net</Text>
            <Text style={[styles.summaryCardAmount, { color: net >= 0 ? '#34C759' : '#FF3B30' }]}>
              {formatCurrency(net)}
            </Text>
          </View>
        </View>

        {/* Budget progress */}
        {budgetSummaryWithLimit.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Budgets</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/budgets')}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.budgetScroll}>
              {budgetSummaryWithLimit.map((item) => (
                <View key={item.category.id} style={styles.budgetCard}>
                  <CategoryIcon icon={item.category.icon} color={item.category.color} size={16} />
                  <Text style={styles.budgetCatName} numberOfLines={1}>
                    {item.category.name}
                  </Text>
                  <BudgetProgressBar percentage={item.percentage} />
                  <Text style={styles.budgetAmounts}>
                    {formatCurrency(item.spent)}{item.limit != null ? ` / ${formatCurrency(item.limit)}` : ''}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Recent transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/transactions')}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>
          {recentTransactions.length === 0 ? (
            <View style={styles.emptyRecent}>
              <Text style={styles.emptyRecentText}>No transactions yet</Text>
            </View>
          ) : (
            recentTransactions.map((tx: Transaction) => {
              const cat = tx.categoryId != null ? categoryMap.get(tx.categoryId) : null;
              const isExpense = tx.type === 'expense';
              return (
                <TouchableOpacity
                  key={tx.id}
                  style={styles.txRow}
                  onPress={() =>
                    router.push({
                      pathname: '/modals/add-transaction',
                      params: { id: tx.id.toString() },
                    })
                  }
                  activeOpacity={0.7}
                >
                  {cat ? (
                    <CategoryIcon icon={cat.icon} color={cat.color} />
                  ) : (
                    <View style={styles.noCategory}>
                      <Ionicons name="help-outline" size={18} color="#8E8E93" />
                    </View>
                  )}
                  <View style={styles.txContent}>
                    <Text style={styles.txMerchant} numberOfLines={1}>
                      {tx.merchant || cat?.name || 'Uncategorized'}
                    </Text>
                    <Text style={styles.txDate}>{formatDate(tx.date)}</Text>
                  </View>
                  <Text style={[styles.txAmount, { color: isExpense ? '#FF3B30' : '#34C759' }]}>
                    {isExpense ? '-' : '+'}{formatCurrency(tx.amount)}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/modals/add-transaction')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  scroll: { paddingBottom: 100 },
  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  monthLabel: { fontSize: 17, fontWeight: '600' },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  summaryCardGreen: {},
  summaryCardRed: {},
  summaryCardLabel: { fontSize: 11, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.3 },
  summaryCardAmount: { fontSize: 15, fontWeight: '700' },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F2F2F7',
  },
  sectionTitle: { fontSize: 15, fontWeight: '600' },
  seeAll: { fontSize: 14, color: '#4F9DDE' },
  budgetScroll: { paddingHorizontal: 12, paddingVertical: 12 },
  budgetCard: {
    width: 120,
    marginHorizontal: 4,
    gap: 6,
    padding: 10,
    backgroundColor: '#F9F9F9',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5EA',
  },
  budgetCatName: { fontSize: 12, fontWeight: '500', color: '#000' },
  budgetAmounts: { fontSize: 11, color: '#8E8E93' },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F2F2F7',
  },
  noCategory: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  txContent: { flex: 1 },
  txMerchant: { fontSize: 15, color: '#000' },
  txDate: { fontSize: 12, color: '#8E8E93', marginTop: 1 },
  txAmount: { fontSize: 15, fontWeight: '600' },
  emptyRecent: { paddingVertical: 32, alignItems: 'center' },
  emptyRecentText: { color: '#C7C7CC', fontSize: 15 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4F9DDE',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
