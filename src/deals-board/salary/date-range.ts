import { toInputDate } from '../utils/date-filters';

export type OkleykaDateMode =
  | { kind: 'month'; year: number; monthIndex: number }
  | { kind: 'range'; dateFrom: string; dateTo: string };

export const getCurrentMonthMode = (now = new Date()): OkleykaDateMode => ({
  kind: 'month',
  year: now.getFullYear(),
  monthIndex: now.getMonth(),
});

export const resolveOkleykaDateRange = (
  mode: OkleykaDateMode,
): { dateFrom: string; dateTo: string } | { error: string } => {
  if (mode.kind === 'month') {
    const start = new Date(mode.year, mode.monthIndex, 1);
    const end = new Date(mode.year, mode.monthIndex + 1, 0);
    return { dateFrom: toInputDate(start), dateTo: toInputDate(end) };
  }
  const dateFrom = mode.dateFrom?.trim() ?? '';
  const dateTo = mode.dateTo?.trim() ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
    return { error: 'Укажите корректный диапазон дат' };
  }
  if (dateFrom > dateTo) {
    return { error: 'Укажите корректный диапазон дат' };
  }
  return { dateFrom, dateTo };
};
