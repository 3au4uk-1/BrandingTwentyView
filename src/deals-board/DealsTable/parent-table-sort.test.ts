import { describe, expect, it } from 'vitest';

import {
  dealBoardSortToSortingState,
  sortingStateToDealBoardSort,
} from './parent-table-sort';

describe('parent-table-sort', () => {
  it('maps AscNullsFirst to asc', () => {
    expect(dealBoardSortToSortingState([{ field: 'name', direction: 'AscNullsFirst' }])).toEqual([
      { id: 'name', desc: false },
    ]);
  });

  it('maps DescNullsLast to desc', () => {
    expect(dealBoardSortToSortingState([{ field: 'loadDate', direction: 'DescNullsLast' }])).toEqual([
      { id: 'loadDate', desc: true },
    ]);
  });

  it('roundtrips DealBoardSort through SortingState', () => {
    const sort = [
      { field: 'name', direction: 'AscNullsFirst' as const },
      { field: 'stage', direction: 'DescNullsLast' as const },
    ];

    expect(sortingStateToDealBoardSort(dealBoardSortToSortingState(sort))).toEqual(sort);
  });

  it('drops __expand from SortingState', () => {
    expect(
      sortingStateToDealBoardSort([
        { id: '__expand', desc: false },
        { id: 'name', desc: true },
      ]),
    ).toEqual([{ field: 'name', direction: 'DescNullsLast' }]);
  });
});
