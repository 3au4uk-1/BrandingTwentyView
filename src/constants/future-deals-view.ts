import type { DealBoardFilters, DealBoardSort } from 'src/deals-board/types';

import { OPPORTUNITY_DATE_FILTER_FIELD } from './date-filter-field';

export const FUTURE_DEALS_VIEW_NAME = 'Будущие сделки';

export const FUTURE_DEALS_VIEW_FILTERS: DealBoardFilters = {
  datePreset: 'future',
  showAll: false,
};

export const FUTURE_DEALS_VIEW_SORT: DealBoardSort[] = [
  { field: OPPORTUNITY_DATE_FILTER_FIELD, direction: 'AscNullsLast' },
];

export const hasFutureDealsViewMechanics = (view: {
  filters: DealBoardFilters;
  sort: DealBoardSort[];
}): boolean =>
  view.filters.datePreset === 'future' &&
  view.sort.length === 1 &&
  view.sort[0]?.field === OPPORTUNITY_DATE_FILTER_FIELD &&
  view.sort[0]?.direction === 'AscNullsLast';
