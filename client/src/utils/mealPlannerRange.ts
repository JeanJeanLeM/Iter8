import { format, startOfMonth, endOfMonth, subWeeks, addWeeks } from 'date-fns';

/**
 * Returns the calendar range "mois ±3 semaines" for caching:
 * from = start of center month − 3 weeks, to = end of center month + 3 weeks.
 * Same center date always yields the same from/to (stable cache key).
 */
export function getCalendarRangeMonthWithWeeks(centerDate: Date): { from: string; to: string } {
  const start = startOfMonth(centerDate);
  const end = endOfMonth(centerDate);
  const from = format(subWeeks(start, 3), 'yyyy-MM-dd');
  const to = format(addWeeks(end, 3), 'yyyy-MM-dd');
  return { from, to };
}
