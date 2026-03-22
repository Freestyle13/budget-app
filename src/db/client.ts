import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

const sqlite = SQLite.openDatabaseSync('budget.db');

export const db = drizzle(sqlite, { schema });

const CREATE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    icon TEXT NOT NULL,
    budget_limit REAL,
    is_income INTEGER NOT NULL DEFAULT 0,
    is_subscription INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount REAL NOT NULL,
    type TEXT NOT NULL,
    category_id INTEGER,
    note TEXT,
    merchant TEXT,
    date INTEGER NOT NULL,
    is_recurring INTEGER NOT NULL DEFAULT 0,
    recurring_bill_id INTEGER,
    source TEXT NOT NULL DEFAULT 'manual',
    import_hash TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS budget_periods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    month TEXT NOT NULL,
    budget_limit REAL NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE(category_id, month)
  );

  CREATE TABLE IF NOT EXISTS recurring_bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    amount REAL NOT NULL,
    category_id INTEGER,
    day_of_month INTEGER NOT NULL DEFAULT 1,
    is_active INTEGER NOT NULL DEFAULT 1,
    last_posted_month TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS savings_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    month TEXT NOT NULL,
    category_id INTEGER NOT NULL,
    saved_amount REAL NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE(month, category_id)
  );

  CREATE TABLE IF NOT EXISTS net_worth_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    institution_name TEXT,
    type TEXT NOT NULL DEFAULT 'checking',
    current_balance REAL NOT NULL DEFAULT 0,
    is_manual INTEGER NOT NULL DEFAULT 1,
    is_active INTEGER NOT NULL DEFAULT 1,
    last_updated INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
`;

const DEFAULT_CATEGORIES = [
  { name: 'Groceries',      color: '#4CAF50', icon: 'basket-outline',           isIncome: 0, isSubscription: 0 },
  { name: 'Dining Out',     color: '#FF9800', icon: 'fast-food-outline',        isIncome: 0, isSubscription: 0 },
  { name: 'Transport',      color: '#2196F3', icon: 'car-outline',              isIncome: 0, isSubscription: 0 },
  { name: 'Housing',        color: '#9C27B0', icon: 'home-outline',             isIncome: 0, isSubscription: 0 },
  { name: 'Utilities',      color: '#00BCD4', icon: 'flash-outline',            isIncome: 0, isSubscription: 0 },
  { name: 'Subscriptions',  color: '#E91E63', icon: 'apps-outline',             isIncome: 0, isSubscription: 1 },
  { name: 'Entertainment',  color: '#673AB7', icon: 'film-outline',             isIncome: 0, isSubscription: 0 },
  { name: 'Health',         color: '#F44336', icon: 'heart-outline',            isIncome: 0, isSubscription: 0 },
  { name: 'Shopping',       color: '#FF5722', icon: 'bag-outline',              isIncome: 0, isSubscription: 0 },
  { name: 'Travel',         color: '#00BCD4', icon: 'airplane-outline',         isIncome: 0, isSubscription: 0 },
  { name: 'Income',         color: '#4CAF50', icon: 'cash-outline',             isIncome: 1, isSubscription: 0 },
  { name: 'Transfer',       color: '#607D8B', icon: 'swap-horizontal-outline',  isIncome: 0, isSubscription: 0 },
];

export function initDatabase() {
  try {
    sqlite.execSync(CREATE_TABLES_SQL);

    // Add columns added in v1.0 to existing installs (safe to run multiple times)
    try { sqlite.execSync(`ALTER TABLE categories ADD COLUMN is_subscription INTEGER NOT NULL DEFAULT 0`); } catch {}
    try { sqlite.execSync(`ALTER TABLE transactions ADD COLUMN recurring_bill_id INTEGER`); } catch {}

    // Seed default categories if none exist
    const count = sqlite.getFirstSync<{ count: number }>(
      'SELECT COUNT(*) as count FROM categories'
    );
    if (count && count.count === 0) {
      const now = Math.floor(Date.now() / 1000);
      DEFAULT_CATEGORIES.forEach((cat, index) => {
        sqlite.runSync(
          `INSERT INTO categories (name, color, icon, is_income, is_subscription, sort_order, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [cat.name, cat.color, cat.icon, cat.isIncome, cat.isSubscription, index, now]
        );
      });
    }
  } catch (error) {
    console.error('Database init error:', error);
  }
}
