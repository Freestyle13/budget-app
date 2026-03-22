import { useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCategoryStore } from '../../src/stores/useCategoryStore';
import { useTransactionStore } from '../../src/stores/useTransactionStore';
import { useBudgetStore } from '../../src/stores/useBudgetStore';
import { CategoryIcon } from '../../src/components/common/CategoryIcon';
import { BudgetProgressBar } from '../../src/components/common/BudgetProgressBar';
import { BudgetRings } from '../../src/components/charts/BudgetRings';
import { formatCurrency } from '../../src/utils/currency';
import { formatMonth, prevMonth, nextMonth } from '../../src/utils/dateHelpers';
import type { BudgetSummaryItem } from '../../src/stores/useBudgetStore';

export default function BudgetsScreen() {
  const { categories, isLoading, fetchCategories } = useCategoryStore();
  const { transactions, selectedMonth, setSelectedMonth, fetchTransactions } = useTransactionStore();
  const { summary, computeSummary } = useBudgetStore();

  useEffect(() => {
    fetchCategories();
    fetchTransactions();
  }, []);

  useEffect(() => {
    if (categories.length > 0) {
      computeSummary(selectedMonth, categories, transactions);
    }
  }, [categories, transactions, selectedMonth]);

  const budgetedItems = summary.filter((s) => s.limit != null);
  const unbudgetedItems = summary.filter((s) => s.limit == null && s.spent > 0);

  const ringData = budgetedItems.map((item) => ({
    label: item.category.name,
    color: item.category.color,
    percentage: item.percentage ?? 0,
    spent: item.spent,
    limit: item.limit ?? 0,
  }));

  const incomeCategories = categories.filter((c) => c.isIncome);

  if (isLoading && categories.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={{ marginTop: 40 }} color="#4F9DDE" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
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

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Budget rings */}
        {ringData.length > 0 ? (
          <View style={styles.ringsCard}>
            <BudgetRings rings={ringData} size={220} />
          </View>
        ) : (
          <View style={styles.noRingsHint}>
            <Ionicons name="information-circle-outline" size={18} color="#C7C7CC" />
            <Text style={styles.noRingsText}>Set budget limits on categories to see rings</Text>
          </View>
        )}

        {/* Budgeted categories */}
        {budgetedItems.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>Budgeted</Text>
            <View style={styles.card}>
              {budgetedItems.map((item, i) => (
                <TouchableOpacity
                  key={item.category.id}
                  style={[styles.row, i < budgetedItems.length - 1 && styles.rowBorder]}
                  onPress={() =>
                    router.push({
                      pathname: '/modals/add-category',
                      params: { id: item.category.id.toString() },
                    })
                  }
                  activeOpacity={0.7}
                >
                  <CategoryIcon icon={item.category.icon} color={item.category.color} />
                  <View style={styles.rowContent}>
                    <View style={styles.rowTop}>
                      <Text style={styles.catName}>{item.category.name}</Text>
                      <Text style={[
                        styles.spent,
                        (item.percentage ?? 0) > 100 && { color: '#FF3B30' },
                        (item.percentage ?? 0) >= 80 && (item.percentage ?? 0) <= 100 && { color: '#FF9500' },
                      ]}>
                        {formatCurrency(item.spent)}
                      </Text>
                    </View>
                    <BudgetProgressBar percentage={item.percentage} />
                    <Text style={styles.limitText}>
                      {formatCurrency(item.spent)} of {formatCurrency(item.limit!)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Unbudgeted spending */}
        {unbudgetedItems.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>No Limit Set</Text>
            <View style={styles.card}>
              {unbudgetedItems.map((item, i) => (
                <TouchableOpacity
                  key={item.category.id}
                  style={[styles.row, i < unbudgetedItems.length - 1 && styles.rowBorder]}
                  onPress={() =>
                    router.push({
                      pathname: '/modals/add-category',
                      params: { id: item.category.id.toString() },
                    })
                  }
                  activeOpacity={0.7}
                >
                  <CategoryIcon icon={item.category.icon} color={item.category.color} />
                  <View style={styles.rowContent}>
                    <View style={styles.rowTop}>
                      <Text style={styles.catName}>{item.category.name}</Text>
                      <Text style={styles.spent}>{formatCurrency(item.spent)}</Text>
                    </View>
                    <Text style={styles.noLimit}>Tap to set a budget limit</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Income categories */}
        {incomeCategories.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>Income Categories</Text>
            <View style={styles.card}>
              {incomeCategories.map((cat, i) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.row, i < incomeCategories.length - 1 && styles.rowBorder]}
                  onPress={() =>
                    router.push({ pathname: '/modals/add-category', params: { id: cat.id.toString() } })
                  }
                  activeOpacity={0.7}
                >
                  <CategoryIcon icon={cat.icon} color={cat.color} />
                  <Text style={[styles.catName, { flex: 1, marginLeft: 12 }]}>{cat.name}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <TouchableOpacity
          style={styles.addCategoryButton}
          onPress={() => router.push('/modals/add-category')}
        >
          <Ionicons name="add-circle-outline" size={20} color="#4F9DDE" />
          <Text style={styles.addCategoryText}>Add Category</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  monthBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E5EA',
  },
  monthLabel: { fontSize: 17, fontWeight: '600' },
  scroll: { paddingBottom: 32 },
  ringsCard: {
    backgroundColor: '#fff', margin: 16, borderRadius: 16,
    padding: 24, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  noRingsHint: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 16, padding: 16, backgroundColor: '#fff', borderRadius: 12,
  },
  noRingsText: { fontSize: 13, color: '#C7C7CC', flex: 1 },
  sectionHeader: {
    fontSize: 13, fontWeight: '600', color: '#8E8E93',
    textTransform: 'uppercase', letterSpacing: 0.5,
    paddingHorizontal: 16, paddingBottom: 6,
  },
  card: {
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 16,
    borderRadius: 12, overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth, borderColor: '#E5E5EA',
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 12,
  },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E5EA' },
  rowContent: { flex: 1, gap: 4 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catName: { fontSize: 16, color: '#000' },
  spent: { fontSize: 16, fontWeight: '600', color: '#000' },
  limitText: { fontSize: 12, color: '#8E8E93' },
  noLimit: { fontSize: 12, color: '#4F9DDE' },
  addCategoryButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, margin: 16, padding: 14,
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth, borderColor: '#E5E5EA',
  },
  addCategoryText: { fontSize: 16, color: '#4F9DDE' },
});
