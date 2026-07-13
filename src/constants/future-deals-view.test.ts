import { describe, expect, it } from 'vitest';

import {
  FUTURE_DEALS_VIEW_FILTERS,
  FUTURE_DEALS_VIEW_SORT,
  hasFutureDealsViewMechanics,
} from 'src/constants/future-deals-view';

describe('hasFutureDealsViewMechanics', () => {
  it('matches future deals filters and sort', () => {
    expect(
      hasFutureDealsViewMechanics({
        filters: FUTURE_DEALS_VIEW_FILTERS,
        sort: FUTURE_DEALS_VIEW_SORT,
      }),
    ).toBe(true);
  });

  it('rejects empty view mechanics', () => {
    expect(
      hasFutureDealsViewMechanics({
        filters: {},
        sort: [],
      }),
    ).toBe(false);
  });
});
