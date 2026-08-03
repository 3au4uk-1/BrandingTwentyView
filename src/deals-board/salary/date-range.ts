import { readLocalStorage, writeLocalStorage } from '../utils/browser-storage';
import { toInputDate } from '../utils/date-filters';

export type OkleykaHalf = 'first' | 'second';

export type OkleykaDateMode =
  | { kind: 'month'; year: number; monthIndex: number }
  | { kind: 'half'; year: number; monthIndex: number; half: OkleykaHalf }
  | { kind: 'range'; dateFrom: string; dateTo: string };

export const DEFAULT_SPLIT_DAY = 15;

export const clampSplitDay = (value: number): number => {
  if (!Number.isFinite(value)) return DEFAULT_SPLIT_DAY;
  return Math.min(25, Math.max(10, Math.trunc(value)));
};

export type SalaryPeriod = { dateFrom: string; dateTo: string };

export const monthKeyOf = (year: number, monthIndex: number): string =>
  `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

const splitDayStorageKey = (year: number, monthIndex: number): string =>
  `okleyka-split-day:${monthKeyOf(year, monthIndex)}`;

export const readStoredSplitDay = (year: number, monthIndex: number): number | null => {
  const raw = readLocalStorage(splitDayStorageKey(year, monthIndex));
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? clampSplitDay(parsed) : null;
};

export const storeSplitDay = (year: number, monthIndex: number, day: number): void => {
  writeLocalStorage(splitDayStorageKey(year, monthIndex), String(clampSplitDay(day)));
};

/** First half always starts on day 1; anything else belongs to the second half. */
export const entryHalf = (periodStart: string): OkleykaHalf =>
  periodStart.slice(8, 10) === '01' ? 'first' : 'second';

/**
 * Infer the split day of a month from already saved salary entries, so the
 * chosen boundary survives reloads and is shared between users.
 */
export const inferSplitDayFromEntries = (
  entries: Array<{ periodStart: string; periodEnd: string }>,
): number | null => {
  for (const e of entries) {
    const day =
      entryHalf(e.periodStart) === 'first'
        ? Number(e.periodEnd.slice(8, 10))
        : Number(e.periodStart.slice(8, 10)) - 1;
    if (Number.isFinite(day) && day >= 10 && day <= 25) return day;
  }
  return null;
};

export const halfPeriod = (
  year: number,
  monthIndex: number,
  half: OkleykaHalf,
  splitDay: number,
): SalaryPeriod => {
  const day = clampSplitDay(splitDay);
  if (half === 'first') {
    return {
      dateFrom: toInputDate(new Date(year, monthIndex, 1)),
      dateTo: toInputDate(new Date(year, monthIndex, day)),
    };
  }
  return {
    dateFrom: toInputDate(new Date(year, monthIndex, day + 1)),
    dateTo: toInputDate(new Date(year, monthIndex + 1, 0)),
  };
};

export const getCurrentMonthMode = (now = new Date()): OkleykaDateMode => ({
  kind: 'month',
  year: now.getFullYear(),
  monthIndex: now.getMonth(),
});

export const resolveOkleykaDateRange = (
  mode: OkleykaDateMode,
  splitDay: number,
): { dateFrom: string; dateTo: string } | { error: string } => {
  if (mode.kind === 'month') {
    const start = new Date(mode.year, mode.monthIndex, 1);
    const end = new Date(mode.year, mode.monthIndex + 1, 0);
    return { dateFrom: toInputDate(start), dateTo: toInputDate(end) };
  }
  if (mode.kind === 'half') {
    return halfPeriod(mode.year, mode.monthIndex, mode.half, splitDay);
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

export const salaryPeriodsForMode = (
  mode: OkleykaDateMode,
  splitDay: number,
): SalaryPeriod[] => {
  if (mode.kind === 'half') {
    return [halfPeriod(mode.year, mode.monthIndex, mode.half, splitDay)];
  }
  if (mode.kind === 'month') {
    return [
      halfPeriod(mode.year, mode.monthIndex, 'first', splitDay),
      halfPeriod(mode.year, mode.monthIndex, 'second', splitDay),
    ];
  }
  return [];
};

export const periodKey = (period: SalaryPeriod): string =>
  `${period.dateFrom}_${period.dateTo}`;

const MONTH_SHORT = [
  'янв', 'фев', 'мар', 'апр', 'май', 'июн',
  'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
];

export const formatPeriodLabel = (period: SalaryPeriod): string => {
  const dayFrom = Number(period.dateFrom.slice(8, 10));
  const dayTo = Number(period.dateTo.slice(8, 10));
  const month = MONTH_SHORT[Number(period.dateFrom.slice(5, 7)) - 1] ?? '';
  return `${dayFrom}–${dayTo} ${month}`;
};
