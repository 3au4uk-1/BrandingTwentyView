import { describe, expect, it } from 'vitest';

import {
  groupLineItemsByOpportunityId,
  shouldUseDealsBoardPageFallback,
} from './deals-board-page-core';

describe('groupLineItemsByOpportunityId', () => {
  it('groups by opportunityId', () => {
    expect(
      groupLineItemsByOpportunityId([
        { id: 'l1', opportunityId: 'o1' },
        { id: 'l2', opportunityId: 'o1' },
        { id: 'l3', opportunityId: 'o2' },
      ]),
    ).toEqual({
      o1: [
        { id: 'l1', opportunityId: 'o1' },
        { id: 'l2', opportunityId: 'o1' },
      ],
      o2: [{ id: 'l3', opportunityId: 'o2' }],
    });
  });
});

describe('shouldUseDealsBoardPageFallback', () => {
  it('falls back on 5xx-shaped errors', () => {
    expect(shouldUseDealsBoardPageFallback({ status: 503 })).toBe(true);
  });

  it('does not fall back on 400', () => {
    expect(shouldUseDealsBoardPageFallback({ status: 400 })).toBe(false);
  });
});
