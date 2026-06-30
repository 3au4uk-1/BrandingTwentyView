import { OPPORTUNITY_DATE_FILTER_FIELD } from 'src/constants/date-filter-field';

import type { DealBoardSort, OpportunityRow } from '../types';
import { toLocalInputDate } from './date-filters';
import { getOpportunityEffectiveDate } from './resolve-opportunity-date';
import { isCancelledOpportunity } from './smart-expand';

const DATE_SORT_FIELDS = new Set([OPPORTUNITY_DATE_FILTER_FIELD, 'closeDate']);

export const getEffectiveOpportunitySort = (sort: DealBoardSort[]): DealBoardSort[] =>
  sort.length
    ? sort
    : [{ field: OPPORTUNITY_DATE_FILTER_FIELD, direction: 'AscNullsFirst' }];

export const sortsByDateField = (sort: DealBoardSort[]): boolean => {
  if (!sort.length) return false;

  return DATE_SORT_FIELDS.has(sort[0].field);
};

const resolveOpportunityDateValue = (
  record: OpportunityRow,
  field: string,
): string | null => {
  if (field === OPPORTUNITY_DATE_FILTER_FIELD) {
    return getOpportunityEffectiveDate(record);
  }

  const primary = record[field];
  if (typeof primary === 'string' && primary.length > 0) {
    return primary;
  }

  return null;
};

const dayKey = (value: string | null): string | null =>
  value ? toLocalInputDate(value) : null;

export const sortOpportunitiesWithCancelledLast = (
  records: OpportunityRow[],
  sort: DealBoardSort[],
): OpportunityRow[] => {
  if (!sortsByDateField(sort)) {
    return records;
  }

  const primarySort = sort[0] ?? {
    field: OPPORTUNITY_DATE_FILTER_FIELD,
    direction: 'AscNullsFirst' as const,
  };
  const direction = primarySort.direction === 'DescNullsLast' ? -1 : 1;

  return [...records].sort((left, right) => {
    const leftDate = resolveOpportunityDateValue(left, primarySort.field);
    const rightDate = resolveOpportunityDateValue(right, primarySort.field);
    const leftDay = dayKey(leftDate);
    const rightDay = dayKey(rightDate);

    if (!leftDay && !rightDay) {
      return left.name.localeCompare(right.name, 'ru');
    }
    if (!leftDay) return -1;
    if (!rightDay) return 1;

    const dayCompare = leftDay.localeCompare(rightDay);
    if (dayCompare !== 0) {
      return direction * dayCompare;
    }

    const leftCancelled = isCancelledOpportunity(
      typeof left.stage === 'string' ? left.stage : null,
    );
    const rightCancelled = isCancelledOpportunity(
      typeof right.stage === 'string' ? right.stage : null,
    );

    if (leftCancelled !== rightCancelled) {
      return leftCancelled ? 1 : -1;
    }

    if (leftDate && rightDate && leftDate !== rightDate) {
      return direction * leftDate.localeCompare(rightDate);
    }

    return left.name.localeCompare(right.name, 'ru');
  });
};
