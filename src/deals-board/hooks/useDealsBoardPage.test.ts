import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import type { LineItemRow } from '../types';
import { lineItemListStatusQueryKey } from './useLineItemListStatus';
import { lineItemsQueryKey } from './useLineItems';
import {
  flattenLineItemsFromPage,
  hydrateDealsBoardPageCache,
} from './useDealsBoardPage';

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
