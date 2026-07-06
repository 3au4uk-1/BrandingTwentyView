import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { opportunitiesQueryKey } from '../hooks/useOpportunities';
import { lineItemsQueryKey } from '../hooks/useLineItems';
import type { LineItemRow, OpportunityRow } from '../types';
import { applyObjectRecordEvent } from './apply-object-record-event';
import type { ObjectRecordEvent } from './types';

const baseEvent = (overrides: Partial<ObjectRecordEvent>): ObjectRecordEvent => ({
  action: 'UPDATED',
  objectNameSingular: 'opportunity',
  recordId: 'opp-1',
  properties: {},
  ...overrides,
});

describe('applyObjectRecordEvent', () => {
  it('patches an opportunity row when it is already in cache', () => {
    const queryClient = new QueryClient();
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
});
