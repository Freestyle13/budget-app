import { eq } from 'drizzle-orm';
import { db } from '../client';
import { recurringBills, type NewRecurringBill } from '../schema';

export function getAllRecurringBills() {
  return db.select().from(recurringBills);
}

export function getActiveRecurringBills() {
  return db.select().from(recurringBills).where(eq(recurringBills.isActive, 1));
}

export function insertRecurringBill(data: Omit<NewRecurringBill, 'id' | 'createdAt'>) {
  const now = Math.floor(Date.now() / 1000);
  return db.insert(recurringBills).values({ ...data, createdAt: now }).returning();
}

export function updateRecurringBill(
  id: number,
  data: Partial<Omit<NewRecurringBill, 'id' | 'createdAt'>>
) {
  return db.update(recurringBills).set(data).where(eq(recurringBills.id, id)).returning();
}

export function deleteRecurringBill(id: number) {
  return db.delete(recurringBills).where(eq(recurringBills.id, id));
}
