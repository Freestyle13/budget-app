import { format, startOfMonth as fnsStartOfMonth, endOfMonth as fnsEndOfMonth } from 'date-fns';

export function currentMonth(): string {
  return format(new Date(), 'yyyy-MM');
}

export function formatMonth(month: string): string {
  const [year, mon] = month.split('-').map(Number);
  return format(new Date(year, mon - 1, 1), 'MMMM yyyy');
}

export function prevMonth(month: string): string {
  const [year, mon] = month.split('-').map(Number);
  const d = new Date(year, mon - 2, 1);
  return format(d, 'yyyy-MM');
}

export function nextMonth(month: string): string {
  const [year, mon] = month.split('-').map(Number);
  const d = new Date(year, mon, 1);
  return format(d, 'yyyy-MM');
}

export function startOfMonth(year: number, month: number): Date {
  return fnsStartOfMonth(new Date(year, month - 1, 1));
}

export function endOfMonth(year: number, month: number): Date {
  return fnsEndOfMonth(new Date(year, month - 1, 1));
}

export function formatDate(timestamp: number): string {
  return format(new Date(timestamp * 1000), 'MMM d, yyyy');
}

export function formatDateGroupHeader(timestamp: number): string {
  return format(new Date(timestamp * 1000), 'EEEE, MMMM d');
}

export function todayTimestamp(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
}

export function timestampToMonth(timestamp: number): string {
  return format(new Date(timestamp * 1000), 'yyyy-MM');
}

export function last6Months(): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(format(d, 'yyyy-MM'));
  }
  return months;
}
