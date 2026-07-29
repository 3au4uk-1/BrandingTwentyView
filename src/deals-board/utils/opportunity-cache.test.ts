import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import type { LineItemRow, OpportunityRow } from '../types';

import { findLineItemOpportunityId, patchOpportunityInCache } from './opportunity-cache';

describe('opportunity-cache', () => {
  it('finds opportunity id for a cached line item', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData<LineItemRow[]>(['lineItems', 'opp-1'], [
      { id: 'li-1', opportunityId: 'opp-1', name: 'Banner' },
    ]);

    expect(findLineItemOpportunityId(queryClient, 'li-1')).toBe('opp-1');
    expect(findLineItemOpportunityId(queryClient, 'missing')).toBeUndefined();
  });

  it('patches opportunity amount in cached pages', () => {
    const queryClient = new QueryClient();
    const records: OpportunityRow[] = [
      { id: 'opp-1', name: 'Deal A', amount: { amountMicros: 1_000_000, currencyCode: 'RUB' } },
      { id: 'opp-2', name: 'Deal B' },
    ];
    queryClient.setQueryData(['opportunities'], { records, totalCount: 2 });

    const didPatch = patchOpportunityInCache(queryClient, 'opp-1', {
      amount: { amountMicros: 4_200_000_000, currencyCode: 'RUB' },
    });

    expect(didPatch).toBe(true);
    const page = queryClient.getQueryData<{ records: OpportunityRow[] }>(['opportunities']);
    expect(page?.records[0].amount).toEqual({
      amountMicros: 4_200_000_000,
      currencyCode: 'RUB',
    });
    expect(page?.records[1].name).toBe('Deal B');
  });
});
