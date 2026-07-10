import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchLineItemsByOpportunityIds } from '../api/line-items';
import { patchOpportunity } from '../api/opportunities';
import { syncDealStage } from './sync-deal-stage';

vi.mock('../api/line-items', () => ({
  fetchLineItemsByOpportunityIds: vi.fn(),
}));

vi.mock('../api/opportunities', () => ({
  patchOpportunity: vi.fn(),
}));

describe('syncDealStage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('computes the stage from an authoritative unfiltered line-item fetch', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['opportunities'], {
      records: [{ id: 'deal-1', name: 'Deal', stage: 'GOTOVO' }],
      totalCount: 1,
    });
    queryClient.setQueryData(['lineItems', ['deal-1'], { stages: ['GOTOVO'] }], [
      { id: 'done-1', name: 'Done', opportunityId: 'deal-1', stage: 'GOTOVO' },
    ]);
    vi.mocked(fetchLineItemsByOpportunityIds).mockResolvedValue([
      { id: 'done-1', name: 'Done', opportunityId: 'deal-1', stage: 'GOTOVO' },
      { id: 'new-1', name: 'New', opportunityId: 'deal-1', stage: 'NOVYY' },
    ]);

    await syncDealStage(queryClient, 'deal-1');

    expect(fetchLineItemsByOpportunityIds).toHaveBeenCalledWith(['deal-1']);
    expect(patchOpportunity).toHaveBeenCalledWith('deal-1', { stage: 'V_RABOTE' });
  });
});
