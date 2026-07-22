import type { DealBoardSort, OpportunityRow } from '../types';
import { toLocalInputDate } from './date-filters';
import { getOpportunityEffectiveDate } from './resolve-opportunity-date';
import { getEffectiveOpportunitySort, sortsByDateField } from './sort-opportunities';

const MONTH_NAMES_RU = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
] as const;

export const shouldShowDaySeparators = (sort: DealBoardSort[]): boolean =>
  sortsByDateField(getEffectiveOpportunitySort(sort));

export const getOpportunityDayKey = (
  record: Pick<OpportunityRow, 'loadDate' | 'closeDate'>,
): string | null => {
  const effectiveDate = getOpportunityEffectiveDate(record);
  return effectiveDate ? toLocalInputDate(effectiveDate) : null;
};

export const formatDaySeparatorLabel = (
  dayKey: string,
  now: Date = new Date(),
): string => {
  const [yearText, monthText, dayText] = dayKey.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (!year || !month || !day) {
    return dayKey;
  }

  const monthName = MONTH_NAMES_RU[month - 1] ?? monthText;
  const includeYear = year !== now.getFullYear();

  return includeYear ? `${day} ${monthName} ${year}` : `${day} ${monthName}`;
};

export const shouldInsertDaySeparatorBefore = (
  previousDayKey: string | null,
  currentDayKey: string | null,
  enabled: boolean,
): boolean => {
  if (!enabled || !currentDayKey) {
    return false;
  }

  return previousDayKey !== currentDayKey;
};
