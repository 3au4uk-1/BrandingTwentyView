import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { archiveManualLineItem } from '../api/crmparser';
import { opportunitiesQueryKey } from '../hooks/useOpportunities';
import { lineItemsQueryKey } from '../hooks/useLineItems';
import type { LineItemRow, OpportunityRow } from '../types';
import { applyObjectRecordEvent } from './apply-object-record-event';
import type { ObjectRecordEvent } from './types';

vi.mock('../api/crmparser', () => ({
  archiveManualLineItem: vi.fn(),
}));

const baseEvent = (overrides: Partial<ObjectRecordEvent>): ObjectRecordEvent => ({
  action: 'UPDATED',
  objectNameSingular: 'opportunity',
  recordId: 'opp-1',
  properties: {},
  ...overrides,
});

describe('applyObjectRecordEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('patches an opportunity row when it is already in cache', () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const filters = {};
    const queryKey = opportunitiesQueryKey(undefined, filters, 0, [], [], false, {}, false, false);
    const records: OpportunityRow[] = [{ id: 'opp-1', name: 'Deal A', stage: 'NEW' }];

    queryClient.setQueryData(queryKey, { records, totalCount: 1 });

    applyObjectRecordEvent(
      queryClient,
      baseEvent({
        properties: { after: { stage: 'WON' } },
      }),
    );

    expect(queryClient.getQueryData<{ records: OpportunityRow[] }>(queryKey)?.records[0]?.stage).toBe(
      'WON',
    );
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['deals-board-page'] });
  });

  it('patches a line item row when it is already in cache', () => {
    const queryClient = new QueryClient();
    const queryKey = lineItemsQueryKey(['opp-1']);
    const items: LineItemRow[] = [
      { id: 'li-1', opportunityId: 'opp-1', name: 'Position', stage: 'NEW' },
    ];

    queryClient.setQueryData(queryKey, items);

    applyObjectRecordEvent(
      queryClient,
      baseEvent({
        objectNameSingular: 'dealLineItem',
        recordId: 'li-1',
        properties: { after: { stage: 'DONE' } },
      }),
    );

    expect(queryClient.getQueryData<LineItemRow[]>(queryKey)?.[0]?.stage).toBe('DONE');
  });

  it('invalidates opportunities when a created record is not in cache', () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    applyObjectRecordEvent(
      queryClient,
      baseEvent({
        action: 'CREATED',
        recordId: 'opp-2',
      }),
    );

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['opportunities'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['deals-board-page'] });
  });

  it('ignores unrelated objects', () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    applyObjectRecordEvent(
      queryClient,
      baseEvent({
        objectNameSingular: 'company',
        recordId: 'company-1',
      }),
    );

    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('archives a synced manual line item on delete', async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    vi.mocked(archiveManualLineItem).mockResolvedValue({ success: true });

    queryClient.setQueryData(['manualLineItemsSynced', 'li-1'], true);

    applyObjectRecordEvent(
      queryClient,
      baseEvent({
        action: 'DELETED',
        objectNameSingular: 'dealLineItem',
        recordId: 'li-1',
      }),
    );

    await vi.waitFor(() => {
      expect(archiveManualLineItem).toHaveBeenCalledWith('li-1');
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['lineItems'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['deals-board-page'] });
  });
});
