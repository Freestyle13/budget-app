import { eq, and, gte, lte, desc, inArray } from 'drizzle-orm';
import { db } from '../client';
import { transactions, type NewTransaction } from '../schema';
import { startOfMonth, endOfMonth } from '../../utils/dateHelpers';

export function getTransactionsByMonth(month: string) {
  const { start, end } = getMonthRange(month);
  return db
    .select()
    .from(transactions)
    .where(and(gte(transactions.date, start), lte(transactions.date, end)))
    .orderBy(desc(transactions.date));
}

export function getTransactionById(id: number) {
  return db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
}

export function getRecentTransactions(limit = 5) {
  return db.select().from(transactions).orderBy(desc(transactions.date)).limit(limit);
}

export function insertTransaction(data: Omit<NewTransaction, 'id' | 'createdAt' | 'updatedAt'>) {
  const now = Math.floor(Date.now() / 1000);
  return db.insert(transactions).values({ ...data, createdAt: now, updatedAt: now }).returning();
}

export function updateTransaction(
  id: number,
  data: Partial<Omit<NewTransaction, 'id' | 'createdAt'>>
) {
  const now = Math.floor(Date.now() / 1000);
  return db
    .update(transactions)
    .set({ ...data, updatedAt: now })
    .where(eq(transactions.id, id))
    .returning();
}

export function deleteTransaction(id: number) {
  return db.delete(transactions).where(eq(transactions.id, id));
}

export function getExistingImportHashes(hashes: string[]) {
  return db
    .select({ importHash: transactions.importHash })
    .from(transactions)
    .where(inArray(transactions.importHash, hashes));
}

function getMonthRange(month: string): { start: number; end: number } {
  const [year, mon] = month.split('-').map(Number);
  const start = Math.floor(startOfMonth(year, mon).getTime() / 1000);
  const end = Math.floor(endOfMonth(year, mon).getTime() / 1000);
  return { start, end };
}
