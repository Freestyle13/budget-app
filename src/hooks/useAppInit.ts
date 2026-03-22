import { useEffect } from 'react';
import { getActiveRecurringBills, updateRecurringBill } from '../db/queries/recurringBills';
import { insertTransaction, getTransactionsByMonth } from '../db/queries/transactions';
import { getAllCategories } from '../db/queries/categories';
import { getBudgetPeriodsForMonth } from '../db/queries/budgets';
import { upsertSavingsEntry } from '../db/queries/savings';
import { currentMonth, prevMonth, todayTimestamp } from '../utils/dateHelpers';

let initRunning = false;

export function useAppInit() {
  useEffect(() => {
    if (!initRunning) {
      initRunning = true;
      runAppInit().finally(() => { initRunning = false; });
    }
  }, []);
}

async function runAppInit() {
  const now = currentMonth();
  const prev = prevMonth(now);

  await Promise.all([
    postDueRecurringBills(now),
    calculatePriorMonthSavings(prev),
  ]);
}

async function postDueRecurringBills(month: string) {
  const bills = await getActiveRecurringBills();
  const today = new Date();
  const currentDay = today.getDate();

  for (const bill of bills) {
    // Skip if already posted this month
    if (bill.lastPostedMonth === month) continue;
    // Skip if bill's day hasn't arrived yet this month
    if (bill.dayOfMonth > currentDay) continue;

    // Post the transaction
    const [year, mon] = month.split('-').map(Number);
    const billDate = new Date(year, mon - 1, Math.min(bill.dayOfMonth, 28));
    const timestamp = Math.floor(billDate.getTime() / 1000);

    await insertTransaction({
      amount: bill.amount,
      type: 'expense',
      categoryId: bill.categoryId,
      merchant: bill.name,
      note: 'Recurring bill',
      date: timestamp,
      isRecurring: 1,
      recurringBillId: bill.id,
      source: 'recurring',
      importHash: null,
    });

    await updateRecurringBill(bill.id, { lastPostedMonth: month });
  }
}

async function calculatePriorMonthSavings(month: string) {
  const [year, mon] = month.split('-').map(Number);
  if (isNaN(year)) return;

  const [categories, transactions, periodOverrides] = await Promise.all([
    getAllCategories(),
    getTransactionsByMonth(month),
    getBudgetPeriodsForMonth(month),
  ]);

  const overrideMap = new Map(periodOverrides.map((p) => [p.categoryId, p.budgetLimit]));

  const spentMap = new Map<number, number>();
  for (const tx of transactions) {
    if (tx.type === 'expense' && tx.categoryId != null) {
      spentMap.set(tx.categoryId, (spentMap.get(tx.categoryId) ?? 0) + tx.amount);
    }
  }

  for (const cat of categories) {
    if (cat.isIncome) continue;
    const limit = overrideMap.has(cat.id)
      ? overrideMap.get(cat.id)!
      : cat.budgetLimit ?? null;
    if (limit == null) continue;

    const spent = spentMap.get(cat.id) ?? 0;
    const saved = limit - spent;
    if (saved <= 0) continue;

    await upsertSavingsEntry({ month, categoryId: cat.id, savedAmount: saved });
  }
}
