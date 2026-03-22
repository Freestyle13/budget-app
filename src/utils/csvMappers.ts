// Known column name variants for each field
const DATE_HEADERS = ['date', 'transaction date', 'posted date', 'posting date', 'trans date'];
const AMOUNT_HEADERS = ['amount', 'transaction amount', 'sum'];
const DEBIT_HEADERS = ['debit', 'debit amount', 'withdrawal', 'withdrawals'];
const CREDIT_HEADERS = ['credit', 'credit amount', 'deposit', 'deposits'];
const MERCHANT_HEADERS = [
  'description', 'merchant', 'payee', 'transaction description',
  'memo', 'details', 'name',
];

export interface ColumnMapping {
  dateCol: string | null;
  amountCol: string | null;
  debitCol: string | null;
  creditCol: string | null;
  merchantCol: string | null;
}

export function detectColumns(headers: string[]): ColumnMapping {
  const lower = headers.map((h) => h.toLowerCase().trim());
  const find = (variants: string[]) =>
    headers[lower.findIndex((h) => variants.includes(h))] ?? null;

  return {
    dateCol: find(DATE_HEADERS),
    amountCol: find(AMOUNT_HEADERS),
    debitCol: find(DEBIT_HEADERS),
    creditCol: find(CREDIT_HEADERS),
    merchantCol: find(MERCHANT_HEADERS),
  };
}

// Keyword → category name mapping for auto-categorization
export const KEYWORD_CATEGORY_MAP: Array<{ keywords: string[]; category: string }> = [
  { keywords: ['starbucks', 'coffee', 'tim horton', 'second cup', 'dunkin'], category: 'Dining Out' },
  { keywords: ['mcdonald', 'burger king', 'kfc', 'subway', 'pizza', 'restaurant', 'sushi', 'thai', 'chinese food', 'fast food', 'taco', 'chipotle', 'wendy'], category: 'Dining Out' },
  { keywords: ['grocery', 'superstore', 'walmart', 'whole foods', 'safeway', 'loblaws', 'metro', 'food basics', 'sobeys', 'aldi', 'trader joe'], category: 'Groceries' },
  { keywords: ['uber', 'lyft', 'transit', 'ttc', 'presto', 'gas', 'shell', 'esso', 'petro', 'parking', 'taxi'], category: 'Transport' },
  { keywords: ['netflix', 'spotify', 'apple.com', 'google play', 'youtube', 'disney', 'hulu', 'amazon prime', 'gaming', 'steam'], category: 'Entertainment' },
  { keywords: ['amazon', 'amzn', 'ebay', 'etsy', 'shopify', 'best buy', 'ikea', 'costco', 'target'], category: 'Shopping' },
  { keywords: ['hydro', 'electric', 'utility', 'water bill', 'gas bill', 'internet', 'bell', 'rogers', 'telus', 'phone bill', 'virgin'], category: 'Utilities' },
  { keywords: ['rent', 'mortgage', 'property tax', 'strata', 'condo fee'], category: 'Housing' },
  { keywords: ['pharmacy', 'shoppers', 'rexall', 'doctor', 'dentist', 'hospital', 'medical', 'health', 'gym', 'fitness'], category: 'Health' },
  { keywords: ['payroll', 'salary', 'direct deposit', 'employment', 'wages', 'income'], category: 'Income' },
];

export function guessCategory(merchant: string): string | null {
  const lower = merchant.toLowerCase();
  for (const { keywords, category } of KEYWORD_CATEGORY_MAP) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return category;
    }
  }
  return null;
}

export function parseAmount(raw: string): number {
  // Remove currency symbols, commas, spaces
  const cleaned = raw.replace(/[$,\s]/g, '').replace(/[()]/g, (c) => (c === '(' ? '-' : ''));
  return Math.abs(parseFloat(cleaned) || 0);
}

export function parseDate(raw: string): number | null {
  // Try common date formats: MM/DD/YYYY, YYYY-MM-DD, DD-MM-YYYY, Month DD YYYY
  const cleaned = raw.trim();

  // ISO format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    const d = new Date(cleaned + 'T00:00:00');
    if (!isNaN(d.getTime())) return Math.floor(d.getTime() / 1000);
  }

  // MM/DD/YYYY or M/D/YYYY
  const slashMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const d = new Date(parseInt(slashMatch[3]), parseInt(slashMatch[1]) - 1, parseInt(slashMatch[2]));
    if (!isNaN(d.getTime())) return Math.floor(d.getTime() / 1000);
  }

  // Try native Date parsing as fallback
  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) return Math.floor(d.getTime() / 1000);

  return null;
}

export function computeImportHash(date: number, amount: number, merchant: string): string {
  // Simple hash: concat key fields as a string — good enough for dedup without crypto
  const raw = `${date}|${amount.toFixed(2)}|${merchant.toLowerCase().trim()}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const chr = raw.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return hash.toString(36);
}
