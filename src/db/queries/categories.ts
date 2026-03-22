import { eq, asc } from 'drizzle-orm';
import { db } from '../client';
import { categories, type NewCategory } from '../schema';

export function getAllCategories() {
  return db.select().from(categories).orderBy(asc(categories.sortOrder));
}

export function getCategoryById(id: number) {
  return db.select().from(categories).where(eq(categories.id, id)).limit(1);
}

export function insertCategory(data: Omit<NewCategory, 'id' | 'createdAt'>) {
  const now = Math.floor(Date.now() / 1000);
  return db.insert(categories).values({ ...data, createdAt: now }).returning();
}

export function updateCategory(id: number, data: Partial<Omit<NewCategory, 'id' | 'createdAt'>>) {
  return db.update(categories).set(data).where(eq(categories.id, id)).returning();
}

export function deleteCategory(id: number) {
  return db.delete(categories).where(eq(categories.id, id));
}
