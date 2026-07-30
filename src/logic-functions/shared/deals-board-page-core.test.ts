import { describe, expect, it } from 'vitest';

import {
  capLineItemIdsForListStatus,
  formatDealsBoardPageFailure,
  groupLineItemsByOpportunityId,
  MAX_LIST_STATUS_BATCH_IDS,
  resolveFieldTypesByName,
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

describe('resolveFieldTypesByName', () => {
  it('defaults to amount CURRENCY when missing or empty', () => {
    expect(resolveFieldTypesByName()).toEqual({ amount: 'CURRENCY' });
    expect(resolveFieldTypesByName({})).toEqual({ amount: 'CURRENCY' });
  });

  it('returns provided map when non-empty', () => {
    expect(resolveFieldTypesByName({ stage: 'SELECT' })).toEqual({ stage: 'SELECT' });
  });
});

describe('capLineItemIdsForListStatus', () => {
  it('caps at MAX_LIST_STATUS_BATCH_IDS', () => {
    const ids = Array.from({ length: MAX_LIST_STATUS_BATCH_IDS + 10 }, (_, i) => `id-${i}`);
    expect(capLineItemIdsForListStatus(ids)).toHaveLength(MAX_LIST_STATUS_BATCH_IDS);
    expect(capLineItemIdsForListStatus(ids)[0]).toBe('id-0');
    expect(capLineItemIdsForListStatus(ids).at(-1)).toBe(`id-${MAX_LIST_STATUS_BATCH_IDS - 1}`);
  });
});

describe('formatDealsBoardPageFailure', () => {
  it('marks fetch failed as network cause', () => {
    expect(formatDealsBoardPageFailure(new Error('fetch failed'))).toEqual({
      error: 'fetch failed',
      cause: 'network',
    });
  });
});

describe('shouldUseDealsBoardPageFallback', () => {
  it('falls back on 5xx-shaped errors', () => {
    expect(shouldUseDealsBoardPageFallback({ status: 503 })).toBe(true);
  });

  it('falls back on 404 (route unavailable / undeployed LF)', () => {
    expect(shouldUseDealsBoardPageFallback({ status: 404 })).toBe(true);
  });

  it('does not fall back on 400', () => {
    expect(shouldUseDealsBoardPageFallback({ status: 400 })).toBe(false);
  });

  it('falls back when proxy is not configured', () => {
    expect(
      shouldUseDealsBoardPageFallback(new Error('Deals board page proxy not configured')),
    ).toBe(true);
    expect(shouldUseDealsBoardPageFallback({ code: 'NOT_CONFIGURED' })).toBe(true);
  });

  it('falls back on AbortError (fetch timeout)', () => {
    expect(
      shouldUseDealsBoardPageFallback(Object.assign(new Error('Aborted'), { name: 'AbortError' })),
    ).toBe(true);
  });
});
