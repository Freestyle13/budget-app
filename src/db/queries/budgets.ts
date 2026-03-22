import { eq, and } from 'drizzle-orm';
import { db } from '../client';
import { budgetPeriods, type NewBudgetPeriod } from '../schema';

export function getBudgetPeriod(categoryId: number, month: string) {
  return db
    .select()
    .from(budgetPeriods)
    .where(and(eq(budgetPeriods.categoryId, categoryId), eq(budgetPeriods.month, month)))
    .limit(1);
}

export function getBudgetPeriodsForMonth(month: string) {
  return db.select().from(budgetPeriods).where(eq(budgetPeriods.month, month));
}

export function upsertBudgetPeriod(data: Omit<NewBudgetPeriod, 'id' | 'createdAt'>) {
  const now = Math.floor(Date.now() / 1000);
  return db
    .insert(budgetPeriods)
    .values({ ...data, createdAt: now })
    .onConflictDoUpdate({
      target: [budgetPeriods.categoryId, budgetPeriods.month],
      set: { budgetLimit: data.budgetLimit },
    })
    .returning();
}

export function deleteBudgetPeriod(categoryId: number, month: string) {
  return db
    .delete(budgetPeriods)
    .where(and(eq(budgetPeriods.categoryId, categoryId), eq(budgetPeriods.month, month)));
}
