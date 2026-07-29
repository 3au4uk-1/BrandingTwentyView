import { describe, expect, it } from 'vitest';

import {
  FUTURE_DEALS_VIEW_FILTERS,
  FUTURE_DEALS_VIEW_SORT,
  hasFutureDealsViewMechanics,
} from 'src/constants/future-deals-view';

describe('FUTURE_DEALS_VIEW_FILTERS', () => {
  it('defaults to future without showAll dump', () => {
    expect(FUTURE_DEALS_VIEW_FILTERS).toEqual({
      datePreset: 'future',
      showAll: false,
    });
  });
});

describe('hasFutureDealsViewMechanics', () => {
  it('matches future deals filters and sort when showAll is false', () => {
    expect(
      hasFutureDealsViewMechanics({
        filters: FUTURE_DEALS_VIEW_FILTERS,
        sort: FUTURE_DEALS_VIEW_SORT,
      }),
    ).toBe(true);
  });

  it('matches when showAll is omitted', () => {
    expect(
      hasFutureDealsViewMechanics({
        filters: { datePreset: 'future' },
        sort: FUTURE_DEALS_VIEW_SORT,
      }),
    ).toBe(true);
  });

  it('still matches legacy showAll true (migration will clear it)', () => {
    expect(
      hasFutureDealsViewMechanics({
        filters: { datePreset: 'future', showAll: true },
        sort: FUTURE_DEALS_VIEW_SORT,
      }),
    ).toBe(true);
  });

  it('rejects empty view mechanics', () => {
    expect(hasFutureDealsViewMechanics({ filters: {}, sort: [] })).toBe(false);
  });
});
