import { OPPORTUNITY_DATE_FILTER_FIELD } from 'src/constants/date-filter-field';

import type { DealBoardFilters } from '../types';

export type DatePreset = 'today' | 'tomorrow' | 'week' | 'month' | 'future' | 'custom';

export const toInputDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
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
  const conditions: Record<string, unknown>[] = [];
  if (dateFrom) conditions.push({ [field]: { gte: dateFrom } });
  if (dateTo) conditions.push({ [field]: { lte: dateTo } });
  if (!conditions.length) return undefined;
  return conditions.length === 1 ? conditions[0] : { and: conditions };
};

/** Matches opportunities by loadDate, falling back to closeDate when loadDate is empty. */
export const buildOpportunityDateFilter = (
  filters: DealBoardFilters,
): Record<string, unknown> | undefined => {
  const dateField = OPPORTUNITY_DATE_FILTER_FIELD;
  const { dateFrom, dateTo } = resolveDealBoardDateRange(filters);

  if (filters.datePreset === 'future') {
    return {
      [dateField]: { gt: getTodayInputDate() },
    };
  }

  if (!dateFrom && !dateTo) {
    return undefined;
  }

  const loadDateFilter = buildDateFieldRangeFilter(dateField, dateFrom, dateTo);
  const closeDateFilter = buildDateFieldRangeFilter('closeDate', dateFrom, dateTo);

  if (!loadDateFilter) {
    return closeDateFilter;
  }

  if (!closeDateFilter) {
    return loadDateFilter;
  }

  return {
    or: [
      loadDateFilter,
      {
        and: [{ [dateField]: { is: 'NULL' } }, closeDateFilter],
      },
    ],
  };
};

export const shouldFetchAllOpportunities = (filters: DealBoardFilters): boolean =>
  filters.datePreset === 'today' ||
  filters.datePreset === 'tomorrow' ||
  (Boolean(filters.dateFrom) &&
    Boolean(filters.dateTo) &&
    filters.dateFrom === filters.dateTo &&
    !filters.datePreset);
