import { create } from 'zustand';
import { type Category } from '../db/schema';
import { getBudgetPeriodsForMonth } from '../db/queries/budgets';

export interface BudgetSummaryItem {
  category: Category;
  spent: number;
  limit: number | null;
  percentage: number | null;
}

interface BudgetState {
  summary: BudgetSummaryItem[];
  computeSummary: (
    month: string,
    categories: Category[],
    transactions: Array<{ categoryId: number | null; amount: number; type: string }>
  ) => Promise<void>;
}

export const useBudgetStore = create<BudgetState>((set) => ({
  summary: [],

  computeSummary: async (month, categories, transactions) => {
    const periodOverrides = await getBudgetPeriodsForMonth(month);
    const overrideMap = new Map(periodOverrides.map((p) => [p.categoryId, p.budgetLimit]));

    const spentMap = new Map<number, number>();
    for (const tx of transactions) {
      if (tx.type === 'expense' && tx.categoryId != null) {
        spentMap.set(tx.categoryId, (spentMap.get(tx.categoryId) ?? 0) + tx.amount);
      }
    }

    const summary: BudgetSummaryItem[] = categories
      .filter((c) => !c.isIncome)
      .map((cat) => {
        const limit = overrideMap.has(cat.id)
          ? overrideMap.get(cat.id)!
          : cat.budgetLimit ?? null;
        const spent = spentMap.get(cat.id) ?? 0;
        const percentage = limit != null && limit > 0 ? (spent / limit) * 100 : null;
        return { category: cat, spent, limit, percentage };
      })
      .filter((item) => item.spent > 0 || item.limit != null);

    set({ summary });
  },
}));
