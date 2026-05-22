import { format, parseISO, startOfMonth, endOfMonth, subMonths, addMonths, differenceInMonths, differenceInDays, isAfter, isBefore, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

export function formatDate(dateStr, pattern = 'dd/MM/yyyy') {
  if (!dateStr) return '';
  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    if (!isValid(date)) return '';
    return format(date, pattern, { locale: es });
  } catch {
    return '';
  }
}

export function formatDateShort(dateStr) {
  return formatDate(dateStr, 'dd MMM');
}

export function formatDateLong(dateStr) {
  return formatDate(dateStr, "d 'de' MMMM 'de' yyyy");
}

export function formatMonthYear(month, year) {
  const date = new Date(year, month - 1, 1);
  return format(date, 'MMMM yyyy', { locale: es });
}

export function formatMonthYearShort(month, year) {
  const date = new Date(year, month - 1, 1);
  return format(date, 'MMM yyyy', { locale: es });
}

export function getMonthDateRange(month, year) {
  const date = new Date(year, month - 1, 1);
  return {
    start: format(startOfMonth(date), 'yyyy-MM-dd'),
    end: format(endOfMonth(date), 'yyyy-MM-dd'),
  };
}

export function todayISO() {
  return format(new Date(), 'yyyy-MM-dd');
}

export function monthsAgo(n) {
  return subMonths(new Date(), n);
}

export function monthsAhead(n) {
  return addMonths(new Date(), n);
}

export function daysUntil(dateStr) {
  if (!dateStr) return null;
  return differenceInDays(parseISO(dateStr), new Date());
}

export function monthsUntil(dateStr) {
  if (!dateStr) return null;
  return Math.max(0, differenceInMonths(parseISO(dateStr), new Date()));
}

export function isOverdue(dateStr) {
  if (!dateStr) return false;
  return isBefore(parseISO(dateStr), new Date());
}

export function isPast(dateStr) {
  if (!dateStr) return false;
  return isBefore(parseISO(dateStr), new Date());
}

export function getCurrentMonthYear() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

export function prevMonth(month, year) {
  const d = subMonths(new Date(year, month - 1, 1), 1);
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}

export function nextMonth(month, year) {
  const d = addMonths(new Date(year, month - 1, 1), 1);
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}
