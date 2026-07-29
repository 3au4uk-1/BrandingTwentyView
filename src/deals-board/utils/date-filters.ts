import { OPPORTUNITY_DATE_FILTER_FIELD } from 'src/constants/date-filter-field';

import type { FilterClause } from '../filter-model/types';
import { hasLineItemFilterClauses } from '../filter-model/has-line-item-filter-clauses';
import type { DealBoardFilters, DealBoardSort } from '../types';
import { OPPORTUNITY_EVENT_DATE_FIELD } from './resolve-opportunity-date';

export { hasLineItemFilterClauses };

export type DatePreset =
  | 'today'
  | 'tomorrow'
  | 'dayAfterTomorrow'
  | 'week'
  | 'month'
  | 'future'
  | 'custom';

const TIGHT_DATE_PRESETS: ReadonlySet<DatePreset> = new Set([
  'today',
  'tomorrow',
  'dayAfterTomorrow',
  'week',
]);

export type LocalDayBounds = {
  gte: string;
  lt: string;
};

export const toInputDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/** Calendar day YYYY-MM-DD in the user's local timezone (matches Twenty CRM date fields). */
export const toLocalInputDate = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return toInputDate(parsed);
  }

  const datePart = trimmed.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : null;
};

export const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const parseInputDate = (inputDate: string): Date => {
  const [year, month, day] = inputDate.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
};

/** Inclusive local calendar day as ISO datetime bounds for DATE_TIME fields. */
export const getLocalDayBounds = (inputDate: string): LocalDayBounds => {
  const start = parseInputDate(inputDate);
  const endExclusive = addDays(start, 1);

  return {
    gte: start.toISOString(),
    lt: endExclusive.toISOString(),
  };
};

export const getTodayInputDate = (): string => toInputDate(new Date());

export const getPresetRange = (preset: Exclude<DatePreset, 'future' | 'custom'>): {
  dateFrom: string;
  dateTo: string;
} => {
  const today = new Date();
  const start = new Date(today);
  const end = new Date(today);

  if (preset === 'today') {
    return { dateFrom: toInputDate(start), dateTo: toInputDate(end) };
  }

  if (preset === 'tomorrow') {
    const tomorrow = addDays(today, 1);
    return { dateFrom: toInputDate(tomorrow), dateTo: toInputDate(tomorrow) };
  }

  if (preset === 'dayAfterTomorrow') {
    const dayAfterTomorrow = addDays(today, 2);
    return {
      dateFrom: toInputDate(dayAfterTomorrow),
      dateTo: toInputDate(dayAfterTomorrow),
    };
  }

  if (preset === 'week') {
    const day = today.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    start.setDate(today.getDate() + mondayOffset);
    end.setTime(start.getTime());
    end.setDate(start.getDate() + 6);
    return { dateFrom: toInputDate(start), dateTo: toInputDate(end) };
  }

  start.setDate(1);
  end.setMonth(end.getMonth() + 1, 0);
  return { dateFrom: toInputDate(start), dateTo: toInputDate(end) };
};

export const resolveDealBoardDateRange = (
  filters: DealBoardFilters,
): { dateFrom?: string; dateTo?: string } => {
  if (filters.datePreset === 'future') {
    return { dateFrom: undefined, dateTo: undefined };
  }

  if (filters.datePreset && filters.datePreset !== 'custom') {
    return getPresetRange(filters.datePreset);
  }

  return {
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
  };
};

const buildDateFieldRangeFilter = (
  field: string,
  dateFrom?: string,
  dateTo?: string,
): Record<string, unknown> | undefined => {
  if (!dateFrom && !dateTo) {
    return undefined;
  }

  if (dateFrom && dateTo && dateFrom === dateTo) {
    const bounds = getLocalDayBounds(dateFrom);
    return {
      and: [{ [field]: { gte: bounds.gte } }, { [field]: { lt: bounds.lt } }],
    };
  }

  const conditions: Record<string, unknown>[] = [];
  if (dateFrom) {
    conditions.push({ [field]: { gte: getLocalDayBounds(dateFrom).gte } });
  }
  if (dateTo) {
    conditions.push({ [field]: { lt: getLocalDayBounds(dateTo).lt } });
  }

  return conditions.length === 1 ? conditions[0] : { and: conditions };
};

/** Matches opportunities by loadDate or closeDate (event date) in range; client refines with effective date. */
export const buildOpportunityDateFilter = (
  filters: DealBoardFilters,
): Record<string, unknown> | undefined => {
  const dateField = OPPORTUNITY_DATE_FILTER_FIELD;
  const { dateFrom, dateTo } = resolveDealBoardDateRange(filters);

  if (filters.datePreset === 'future') {
    const todayBounds = getLocalDayBounds(getTodayInputDate());
    return {
      or: [
        { [dateField]: { gte: todayBounds.lt } },
        { [OPPORTUNITY_EVENT_DATE_FIELD]: { gte: todayBounds.lt } },
      ],
    };
  }

  if (!dateFrom && !dateTo) {
    return undefined;
  }

  const loadDateFilter = buildDateFieldRangeFilter(dateField, dateFrom, dateTo);
  const closeDateFilter = buildDateFieldRangeFilter(OPPORTUNITY_EVENT_DATE_FIELD, dateFrom, dateTo);

  if (!loadDateFilter) {
    return closeDateFilter;
  }

  if (!closeDateFilter) {
    return loadDateFilter;
  }

  return {
    or: [loadDateFilter, closeDateFilter],
  };
};

export const shouldFetchAllOpportunities = (
  filters: DealBoardFilters,
  _sort?: DealBoardSort[],
  clauses?: FilterClause[],
): boolean => {
  if (clauses?.length && hasLineItemFilterClauses(clauses)) {
    return true;
  }

  const preset = filters.datePreset;
  if (preset && TIGHT_DATE_PRESETS.has(preset)) {
    return false;
  }

  if (preset === 'future') {
    return false;
  }

  if (preset === 'custom') {
    return true;
  }

  return Boolean(buildOpportunityDateFilter(filters));
};
