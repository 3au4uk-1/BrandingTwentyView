import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchDealsBoardPage } from '../api/deals-board-page';
import { fetchLineItemOpportunityIdsByFilters } from '../api/line-items';
import type { LineItemRow } from '../types';
import { lineItemListStatusQueryKey } from './useLineItemListStatus';
import { lineItemsQueryKey } from './useLineItems';
import {
  fetchDealsBoardPageQueryData,
  flattenLineItemsFromPage,
  hydrateDealsBoardPageCache,
} from './useDealsBoardPage';

vi.mock('../api/deals-board-page', () => ({
  fetchDealsBoardPage: vi.fn(),
  fetchLegacyDealsBoardPage: vi.fn(),
}));

vi.mock('../api/line-items', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/line-items')>();
  return {
    ...actual,
    fetchLineItemOpportunityIdsBySearch: vi.fn(),
    fetchLineItemOpportunityIdsByFilters: vi.fn(),
  };
});

vi.mock('../api/crmparser', () => ({
  isCrmparserConfigured: vi.fn(() => false),
}));

describe('flattenLineItemsFromPage', () => {
  it('flattens grouped line items', () => {
    expect(
      flattenLineItemsFromPage({
        o1: [
          { id: 'l1', opportunityId: 'o1' },
          { id: 'l2', opportunityId: 'o1' },
        ],
        o2: [{ id: 'l3', opportunityId: 'o2' }],
      }),
    ).toEqual([
      { id: 'l1', opportunityId: 'o1' },
      { id: 'l2', opportunityId: 'o1' },
      { id: 'l3', opportunityId: 'o2' },
    ]);
  });
});

describe('hydrateDealsBoardPageCache', () => {
  it('seeds line items and list-status query keys', () => {
    const queryClient = new QueryClient();
    const lineItemFilters = { stages: ['NEW'] };

    hydrateDealsBoardPageCache(queryClient, {
      opportunityIds: ['o2', 'o1'],
      lineItemFilters,
      lineItemsByOppId: {
        o1: [{ id: 'l1', opportunityId: 'o1', stage: 'NEW' }],
        o2: [{ id: 'l2', opportunityId: 'o2', stage: 'NEW' }],
      },
      listStatusByLineItemId: {
        l1: { blacklisted: true },
      },
    });

    expect(
      queryClient.getQueryData<LineItemRow[]>(lineItemsQueryKey(['o1', 'o2'], lineItemFilters)),
    ).toEqual([
      { id: 'l1', opportunityId: 'o1', stage: 'NEW' },
      { id: 'l2', opportunityId: 'o2', stage: 'NEW' },
    ]);
    expect(queryClient.getQueryData(lineItemListStatusQueryKey('l1'))).toEqual({
      blacklisted: true,
    });
  });
});

describe('fetchDealsBoardPageQueryData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchDealsBoardPage).mockResolvedValue({
      opportunities: [{ id: 'opp-stage', name: 'Deal' }],
      totalCount: 1,
      lineItemsByOppId: {},
    });
  });

  it('prefetches opportunity ids for stage filters without search', async () => {
    vi.mocked(fetchLineItemOpportunityIdsByFilters).mockResolvedValue(['opp-stage']);

    const queryClient = new QueryClient();
    await fetchDealsBoardPageQueryData(
      {
        filters: { datePreset: 'future' },
        sort: [],
        page: 0,
        lineItemFilters: { stages: ['NOVYY'] },
      },
      queryClient,
    );

    expect(fetchLineItemOpportunityIdsByFilters).toHaveBeenCalledWith({ stages: ['NOVYY'] });
    expect(fetchDealsBoardPage).toHaveBeenCalledWith(
      expect.objectContaining({
        opportunityFilter: expect.objectContaining({
          and: expect.arrayContaining([{ id: { in: ['opp-stage'] } }]),
        }),
      }),
      expect.any(Function),
    );
  });
});
