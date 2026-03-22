import { eq } from 'drizzle-orm';
import { db } from '../client';
import { netWorthAccounts, type NewNetWorthAccount } from '../schema';

export function getAllAccounts() {
  return db.select().from(netWorthAccounts).where(eq(netWorthAccounts.isActive, 1));
}

export function insertAccount(data: Omit<NewNetWorthAccount, 'id' | 'createdAt'>) {
  const now = Math.floor(Date.now() / 1000);
  return db.insert(netWorthAccounts).values({ ...data, createdAt: now }).returning();
}

export function updateAccount(
  id: number,
  data: Partial<Omit<NewNetWorthAccount, 'id' | 'createdAt'>>
) {
  const now = Math.floor(Date.now() / 1000);
  return db
    .update(netWorthAccounts)
    .set({ ...data, lastUpdated: now })
    .where(eq(netWorthAccounts.id, id))
    .returning();
}

export function deleteAccount(id: number) {
  return db
    .update(netWorthAccounts)
    .set({ isActive: 0 })
    .where(eq(netWorthAccounts.id, id));
}
