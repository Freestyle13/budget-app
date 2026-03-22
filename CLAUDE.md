# Budget App — Claude Context

## What This Is
Personal iOS budgeting app for one user. Privacy-first: all financial data lives locally on the iPhone in SQLite, never leaves the device. Built with Expo + React Native + TypeScript.

## User Profile
- Financially stable, main gap is tracking irregular spending (vacations, etc.)
- Accounts: Charles Schwab (checking), Capital One (savings), Discover It (credit), Chase Freedom Unlimited (credit), UBI Credit Union (credit — lower volume, manual only)
- Wants a polished, easy-to-use portal — not a complex finance tool

---

## Tech Stack
| Layer | Choice |
|---|---|
| Framework | Expo SDK 54 + React Native 0.81 + TypeScript |
| Routing | Expo Router v6 (file-based) |
| Database | expo-sqlite + drizzle-orm (local SQLite) |
| State | Zustand |
| Charts | Custom react-native-svg (DonutChart, BarChart, BudgetRings) |
| CSV | papaparse |
| Forms | react-hook-form + zod |
| Dates | date-fns |

**Important:** All `npm install` commands need `--legacy-peer-deps`.

---

## Design
- Clean white/light background, iOS-native feel
- Bold accent colors per category
- "Serious but fun" — professional with visual character
- Apple Fitness-style concentric fill rings for budget progress (one ring per category, color-coded)
- Bold numbers, clean typographic hierarchy

---

## Database Schema

**categories** — id, name, color, icon, budgetLimit, isIncome, isSubscription, sortOrder, createdAt

**transactions** — id, amount, type, categoryId, merchant, note, date (unix timestamp), isRecurring, recurringBillId, source (manual/csv/plaid), importHash, createdAt, updatedAt

**budget_periods** — id, categoryId, month (YYYY-MM), budgetLimit — monthly overrides per category

**recurring_bills** — id, name, amount, categoryId, dayOfMonth, isActive, lastPostedMonth, createdAt

**savings_entries** — id, month (YYYY-MM), categoryId, savedAmount — auto-calculated at month rollover

**net_worth_accounts** — id, name, institutionName, type, currentBalance, isManual, isActive, lastUpdated, createdAt

---

## Navigation Structure

### 5 Tabs
1. **Dashboard** (`app/(tabs)/index.tsx`) — month selector, income/expenses/net cards, budget rings preview, recent 5 transactions, FAB
2. **Transactions** (`app/(tabs)/transactions.tsx`) — searchable list grouped by date, filter chips, month nav, Import CSV button, FAB
3. **Budgets** (`app/(tabs)/budgets.tsx`) — Apple Fitness rings, category list with progress bars
4. **Reports** (`app/(tabs)/reports.tsx`) — Month/Year/2Year/Net Worth switcher, DonutChart, BarChart, savings tracker
5. **Settings** (`app/(tabs)/settings.tsx`) — recurring bills, net worth accounts, reminder config

### Modals
- `app/modals/add-transaction.tsx` — numpad entry, type toggle (expense/income/transfer), category picker, merchant/note/date
- `app/modals/add-category.tsx` — color grid, icon grid, budget limit, income toggle
- `app/modals/add-recurring-bill.tsx` — name, amount, day-of-month (1–28), active toggle, category
- `app/modals/add-account.tsx` — name, institution, type, balance
- `app/modals/import-csv.tsx` — 4-step: pick file → map columns → review → done
- `app/modals/transaction-detail.tsx` — read-only transaction view

---

## Key Logic

### DB Init
`src/db/client.ts` — `initDatabase()` is called synchronously at module level in `app/_layout.tsx` (before any component mounts) to ensure tables exist before any queries run. Seeds 12 default categories on first run.

### Recurring Bills
`src/hooks/useAppInit.ts` — on app open, checks all active recurring bills. If `lastPostedMonth !== currentMonth` and `dayOfMonth <= today`, auto-inserts a transaction and updates `lastPostedMonth`. Guarded by `initRunning` flag.

### Monthly Savings
Same `useAppInit` hook — calculates prior month savings: for each expense category, `saved = budgetLimit - totalSpent`. If `saved > 0`, upserts into `savings_entries`. Never rolls over to next month's budget.

### Shared Month State
`src/stores/useTransactionStore.ts` — `selectedMonth` (YYYY-MM) is shared state across all tabs. Changing it triggers a re-fetch.

### CSV Import
`src/utils/csvMappers.ts` — auto-detects column names, keyword→category mapping, dedup via djb2 hash (date+amount+merchant stored as `importHash`).

### Cross-Month Transaction Editing
`add-transaction.tsx` fetches the transaction directly from DB via `getTransactionById(id)` — not from the month-filtered store — so transactions from any month can be edited.

---

## Versioning

### v1.0 — Complete local app ✅
All features implemented and running on iPhone via standalone build.

### v1.1 — Plaid integration (future)
- Cloudflare Workers stateless proxy (free tier)
- Plaid Link flow in-app
- Daily sync for Schwab, Capital One, Discover, Chase
- `plaid_items` + `plaid_accounts` tables added to schema
- Access tokens stored in iOS Secure Enclave (expo-secure-store), never in SQLite
- UBI Credit Union stays manual throughout (not supported by Plaid)
- Net worth view pulls live balances from Plaid

---

## What NOT to Build
- No web version (security/privacy)
- No savings rollover between months
- No end-of-month savings confirmation prompt (fully automatic)
- No Android support needed (iOS personal use only)
