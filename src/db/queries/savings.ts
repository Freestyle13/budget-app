import { eq, desc } from 'drizzle-orm';
import { db } from '../client';
import { savingsEntries, type NewSavingsEntry } from '../schema';

export function getSavingsForMonth(month: string) {
  return db.select().from(savingsEntries).where(eq(savingsEntries.month, month));
}

export function getAllSavings() {
  return db.select().from(savingsEntries).orderBy(desc(savingsEntries.month));
}

export function upsertSavingsEntry(data: Omit<NewSavingsEntry, 'id' | 'createdAt'>) {
  const now = Math.floor(Date.now() / 1000);
  return db
    .insert(savingsEntries)
    .values({ ...data, createdAt: now })
    .onConflictDoUpdate({
      target: [savingsEntries.month, savingsEntries.categoryId],
      set: { savedAmount: data.savedAmount },
    })
    .returning();
}
