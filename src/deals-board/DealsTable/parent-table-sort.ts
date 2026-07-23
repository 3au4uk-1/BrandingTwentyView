import type { SortingState } from '@tanstack/react-table';

import type { DealBoardSort } from '../types';

export const PARENT_EXPAND_COLUMN_FIELD = '__expand';

export const dealBoardSortToSortingState = (sort: DealBoardSort[]): SortingState =>
  sort.map(({ field, direction }) => ({
    id: field,
    desc: direction === 'DescNullsLast',
  }));

export const sortingStateToDealBoardSort = (state: SortingState): DealBoardSort[] =>
  state
    .filter(({ id }) => id !== PARENT_EXPAND_COLUMN_FIELD)
    .map(({ id, desc }) => ({
      field: id,
      direction: desc ? 'DescNullsLast' : 'AscNullsFirst',
    }));
