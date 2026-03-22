import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTransactionStore } from '../../src/stores/useTransactionStore';
import { useCategoryStore } from '../../src/stores/useCategoryStore';
import { CategoryIcon } from '../../src/components/common/CategoryIcon';
import { formatCurrency } from '../../src/utils/currency';
import { formatDateGroupHeader, formatMonth, prevMonth, nextMonth } from '../../src/utils/dateHelpers';
import type { Transaction } from '../../src/db/schema';

type FilterType = 'all' | 'expense' | 'income';

type ListItem =
  | { kind: 'header'; date: number; total: number }
  | { kind: 'transaction'; tx: Transaction };

export default function TransactionsScreen() {
  const { transactions, selectedMonth, setSelectedMonth, fetchTransactions, deleteTransaction } =
    useTransactionStore();
  const { categories, fetchCategories } = useCategoryStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    fetchCategories();
    fetchTransactions();
  }, []);

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (filter === 'expense' && tx.type !== 'expense') return false;
      if (filter === 'income' && tx.type !== 'income') return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !tx.merchant?.toLowerCase().includes(q) &&
          !tx.note?.toLowerCase().includes(q) &&
          !categoryMap.get(tx.categoryId ?? -1)?.name.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [transactions, filter, search, categoryMap]);

  const listItems = useMemo<ListItem[]>(() => {
    const groups = new Map<number, Transaction[]>();
    for (const tx of filtered) {
      const key = tx.date;
      const dayStart = Math.floor(tx.date / 86400) * 86400;
      if (!groups.has(dayStart)) groups.set(dayStart, []);
      groups.get(dayStart)!.push(tx);
    }
    const sorted = Array.from(groups.entries()).sort(([a], [b]) => b - a);
    const items: ListItem[] = [];
    for (const [date, txs] of sorted) {
      const total = txs.reduce(
        (sum, t) => (t.type === 'expense' ? sum - t.amount : sum + t.amount),
        0
      );
      items.push({ kind: 'header', date, total });
      for (const tx of txs.sort((a, b) => b.date - a.date)) {
        items.push({ kind: 'transaction', tx });
      }
    }
    return items;
  }, [filtered]);

  function handleDelete(tx: Transaction) {
    Alert.alert('Delete Transaction', `Delete this ${tx.type} of ${formatCurrency(tx.amount)}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteTransaction(tx.id),
      },
    ]);
  }

  function renderItem({ item }: { item: ListItem }) {
    if (item.kind === 'header') {
      return (
        <View style={styles.dateHeader}>
          <Text style={styles.dateHeaderText}>{formatDateGroupHeader(item.date)}</Text>
          <Text style={[styles.dateHeaderTotal, { color: item.total >= 0 ? '#34C759' : '#FF3B30' }]}>
            {item.total >= 0 ? '+' : ''}{formatCurrency(item.total)}
          </Text>
        </View>
      );
    }

    const { tx } = item;
    const cat = tx.categoryId != null ? categoryMap.get(tx.categoryId) : null;
    const isExpense = tx.type === 'expense';

    return (
      <TouchableOpacity
        style={styles.txRow}
        onPress={() =>
          router.push({ pathname: '/modals/add-transaction', params: { id: tx.id.toString() } })
        }
        onLongPress={() => handleDelete(tx)}
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
          {tx.note ? <Text style={styles.txNote} numberOfLines={1}>{tx.note}</Text> : null}
        </View>
        <Text style={[styles.txAmount, { color: isExpense ? '#FF3B30' : '#34C759' }]}>
          {isExpense ? '-' : '+'}{formatCurrency(tx.amount)}
        </Text>
      </TouchableOpacity>
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

      {/* Search */}
      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color="#8E8E93" />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search transactions..."
          placeholderTextColor="#C7C7CC"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {(['all', 'expense', 'income'] as FilterType[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          style={styles.importButton}
          onPress={() => router.push('/modals/import-csv')}
        >
          <Ionicons name="cloud-upload-outline" size={16} color="#4F9DDE" />
          <Text style={styles.importButtonText}>Import</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={listItems}
        keyExtractor={(item, index) =>
          item.kind === 'header' ? `h-${item.date}` : `t-${item.tx.id}`
        }
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color="#C7C7CC" />
            <Text style={styles.emptyText}>No transactions</Text>
            <Text style={styles.emptySubText}>Tap + to add one</Text>
          </View>
        }
      />

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
  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  monthLabel: { fontSize: 17, fontWeight: '600' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#000' },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#E5E5EA',
  },
  filterChipActive: { backgroundColor: '#4F9DDE' },
  filterChipText: { fontSize: 13, color: '#8E8E93' },
  filterChipTextActive: { color: '#fff', fontWeight: '600' },
  importButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  importButtonText: { color: '#4F9DDE', fontSize: 14 },
  list: { paddingBottom: 100 },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#F2F2F7',
  },
  dateHeaderText: { fontSize: 13, color: '#8E8E93', fontWeight: '500' },
  dateHeaderTotal: { fontSize: 13, fontWeight: '600' },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
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
  txMerchant: { fontSize: 16, color: '#000' },
  txNote: { fontSize: 13, color: '#8E8E93', marginTop: 1 },
  txAmount: { fontSize: 16, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyText: { fontSize: 17, color: '#8E8E93' },
  emptySubText: { fontSize: 14, color: '#C7C7CC' },
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
