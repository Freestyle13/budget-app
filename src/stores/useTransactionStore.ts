import { create } from 'zustand';
import { type Transaction, type NewTransaction } from '../db/schema';
import {
  getTransactionsByMonth,
  getRecentTransactions,
  insertTransaction,
  updateTransaction,
  deleteTransaction,
} from '../db/queries/transactions';
import { currentMonth } from '../utils/dateHelpers';

interface TransactionState {
  transactions: Transaction[];
  recentTransactions: Transaction[];
  selectedMonth: string;
  isLoading: boolean;
  setSelectedMonth: (month: string) => void;
  fetchTransactions: () => Promise<void>;
  fetchRecentTransactions: () => Promise<void>;
  addTransaction: (data: Omit<NewTransaction, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTransaction: (id: number, data: Partial<Omit<NewTransaction, 'id' | 'createdAt'>>) => Promise<void>;
  deleteTransaction: (id: number) => Promise<void>;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  recentTransactions: [],
  selectedMonth: currentMonth(),
  isLoading: false,

  setSelectedMonth: (month) => {
    set({ selectedMonth: month });
    get().fetchTransactions();
  },

  fetchTransactions: async () => {
    set({ isLoading: true });
    try {
      const result = await getTransactionsByMonth(get().selectedMonth);
      set({ transactions: result });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchRecentTransactions: async () => {
    const result = await getRecentTransactions(5);
    set({ recentTransactions: result });
  },

  addTransaction: async (data) => {
    await insertTransaction(data);
    await get().fetchTransactions();
    await get().fetchRecentTransactions();
  },

  updateTransaction: async (id, data) => {
    await updateTransaction(id, data);
    await get().fetchTransactions();
    await get().fetchRecentTransactions();
  },

  deleteTransaction: async (id) => {
    await deleteTransaction(id);
    await get().fetchTransactions();
    await get().fetchRecentTransactions();
  },
}));
