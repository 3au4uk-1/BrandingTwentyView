import type { DealBoardFilters, OpportunityRow } from '../types';

import {
  getLocalDayBounds,
  getTodayInputDate,
  resolveDealBoardDateRange,
  toInputDate,
} from './date-filters';

export const OPPORTUNITY_EVENT_DATE_FIELD = 'closeDate';

export const getOpportunityEffectiveDate = (
  record: Pick<OpportunityRow, 'loadDate' | 'closeDate'>,
): string | null => {
  const loadDate = record.loadDate;
  if (typeof loadDate === 'string' && loadDate.trim().length > 0) {
    return loadDate;
  }

  const closeDate = record.closeDate;
  if (typeof closeDate === 'string' && closeDate.trim().length > 0) {
    return closeDate;
  }

  return null;
};

const toCalendarDay = (value: string): string | null => {
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return toInputDate(parsed);
  }

  return value.length >= 10 ? value.slice(0, 10) : null;
};

export const opportunityMatchesDateFilter = (
  record: Pick<OpportunityRow, 'loadDate' | 'closeDate'>,
  filters: DealBoardFilters,
): boolean => {
  const effectiveDate = getOpportunityEffectiveDate(record);

  if (filters.datePreset === 'future') {
    if (!effectiveDate) return false;

    const tomorrowStart = getLocalDayBounds(getTodayInputDate()).lt;
    return new Date(effectiveDate).getTime() >= new Date(tomorrowStart).getTime();
  }

  const { dateFrom, dateTo } = resolveDealBoardDateRange(filters);
  if (!dateFrom && !dateTo) return true;
  if (!effectiveDate) return false;

  const day = toCalendarDay(effectiveDate);
  if (!day) return false;

  if (dateFrom && dateTo && dateFrom === dateTo) {
    return day === dateFrom;
  }

  if (dateFrom && day < dateFrom) return false;
  if (dateTo && day > dateTo) return false;

  return true;
};
