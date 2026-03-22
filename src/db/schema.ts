import { int, real, text, sqliteTable, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const categories = sqliteTable('categories', {
  id: int('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  color: text('color').notNull(),
  icon: text('icon').notNull(),
  budgetLimit: real('budget_limit'),
  isIncome: int('is_income').notNull().default(0),
  isSubscription: int('is_subscription').notNull().default(0),
  sortOrder: int('sort_order').notNull().default(0),
  createdAt: int('created_at').notNull(),
});

export const transactions = sqliteTable('transactions', {
  id: int('id').primaryKey({ autoIncrement: true }),
  amount: real('amount').notNull(),
  type: text('type').notNull(),          // "income" | "expense" | "transfer"
  categoryId: int('category_id'),
  note: text('note'),
  merchant: text('merchant'),
  date: int('date').notNull(),
  isRecurring: int('is_recurring').notNull().default(0),
  recurringBillId: int('recurring_bill_id'),
  source: text('source').notNull().default('manual'), // "manual" | "csv_import" | "recurring"
  importHash: text('import_hash'),
  createdAt: int('created_at').notNull(),
  updatedAt: int('updated_at').notNull(),
});

export const budgetPeriods = sqliteTable(
  'budget_periods',
  {
    id: int('id').primaryKey({ autoIncrement: true }),
    categoryId: int('category_id').notNull(),
    month: text('month').notNull(),
    budgetLimit: real('budget_limit').notNull(),
    createdAt: int('created_at').notNull(),
  },
  (table) => ({
    uniqueCategoryMonth: uniqueIndex('unique_category_month').on(table.categoryId, table.month),
  })
);

// v1.0 additions

export const recurringBills = sqliteTable('recurring_bills', {
  id: int('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  amount: real('amount').notNull(),
  categoryId: int('category_id'),
  dayOfMonth: int('day_of_month').notNull().default(1), // 1-28
  isActive: int('is_active').notNull().default(1),
  lastPostedMonth: text('last_posted_month'),           // "YYYY-MM" of last auto-post
  createdAt: int('created_at').notNull(),
});

export const savingsEntries = sqliteTable(
  'savings_entries',
  {
    id: int('id').primaryKey({ autoIncrement: true }),
    month: text('month').notNull(),        // "YYYY-MM"
    categoryId: int('category_id').notNull(),
    savedAmount: real('saved_amount').notNull(),
    createdAt: int('created_at').notNull(),
  },
  (table) => ({
    uniqueMonthCategory: uniqueIndex('unique_month_category').on(table.month, table.categoryId),
  })
);

export const netWorthAccounts = sqliteTable('net_worth_accounts', {
  id: int('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  institutionName: text('institution_name'),
  type: text('type').notNull().default('checking'), // "checking" | "savings" | "credit" | "investment"
  currentBalance: real('current_balance').notNull().default(0),
  isManual: int('is_manual').notNull().default(1),  // 1 = manual entry, 0 = future Plaid
  isActive: int('is_active').notNull().default(1),
  lastUpdated: int('last_updated').notNull(),
  createdAt: int('created_at').notNull(),
});

// Types
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type BudgetPeriod = typeof budgetPeriods.$inferSelect;
export type NewBudgetPeriod = typeof budgetPeriods.$inferInsert;
export type RecurringBill = typeof recurringBills.$inferSelect;
export type NewRecurringBill = typeof recurringBills.$inferInsert;
export type SavingsEntry = typeof savingsEntries.$inferSelect;
export type NewSavingsEntry = typeof savingsEntries.$inferInsert;
export type NetWorthAccount = typeof netWorthAccounts.$inferSelect;
export type NewNetWorthAccount = typeof netWorthAccounts.$inferInsert;
