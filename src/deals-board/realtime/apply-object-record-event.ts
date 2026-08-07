import type { QueryClient } from '@tanstack/react-query';

import { archiveManualLineItem } from '../api/crmparser';
import type { LineItemRow } from '../types';
import { patchOpportunityInCache } from '../utils/opportunity-cache';
import { syncDealStage } from '../utils/sync-deal-stage';
import { WATCHED_OBJECT_NAMES } from './constants';
import { resolveEventPatch } from './resolve-event-patch';
import type { ObjectRecordEvent } from './types';

const isWatchedObject = (objectNameSingular: string): boolean =>
  WATCHED_OBJECT_NAMES.includes(objectNameSingular as (typeof WATCHED_OBJECT_NAMES)[number]);

const patchLineItemInCache = (
  queryClient: QueryClient,
  recordId: string,
  patch: Record<string, unknown>,
): boolean => {
  let didPatch = false;

  for (const [queryKey, items] of queryClient.getQueriesData<LineItemRow[]>({
    queryKey: ['lineItems'],
  })) {
    if (!items?.some((item) => item.id === recordId)) continue;

    queryClient.setQueryData<LineItemRow[]>(
      queryKey,
      items.map((item) => (item.id === recordId ? { ...item, ...patch } : item)),
    );
    didPatch = true;
  }

  return didPatch;
};

const findLineItemOpportunityId = (
  queryClient: QueryClient,
  recordId: string,
): string | undefined => {
  for (const [, items] of queryClient.getQueriesData<LineItemRow[]>({
    queryKey: ['lineItems'],
  })) {
    const match = items?.find((item) => item.id === recordId);
    if (match?.opportunityId) return match.opportunityId;
  }

  return undefined;
};

const invalidateObjectQueries = (queryClient: QueryClient, objectNameSingular: string): void => {
  if (objectNameSingular === 'opportunity') {
    queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    queryClient.invalidateQueries({ queryKey: ['deals-board-page'] });
    return;
  }

  if (objectNameSingular === 'dealLineItem') {
    queryClient.invalidateQueries({ queryKey: ['lineItems'] });
    queryClient.invalidateQueries({ queryKey: ['deals-board-page'] });
  }
};

export const applyObjectRecordEvent = (
  queryClient: QueryClient,
  event: ObjectRecordEvent,
): void => {
  if (!isWatchedObject(event.objectNameSingular)) return;

  if (event.action === 'DELETED' && event.objectNameSingular === 'dealLineItem') {
    if (queryClient.getQueryData(['manualLineItemsSynced', event.recordId])) {
      void archiveManualLineItem(event.recordId).catch(() => undefined);
    }
    invalidateObjectQueries(queryClient, 'dealLineItem');
    return;
  }

  const patch = resolveEventPatch(event.properties);
  const canPatch =
    (event.action === 'UPDATED' || event.action === 'UPSERTED' || event.action === 'RESTORED') &&
    Boolean(patch);

  if (canPatch && patch) {
    const didPatch =
      event.objectNameSingular === 'opportunity'
        ? patchOpportunityInCache(queryClient, event.recordId, patch)
        : patchLineItemInCache(queryClient, event.recordId, patch);

    if (didPatch) {
      if (event.objectNameSingular === 'dealLineItem') {
        const opportunityId =
          typeof patch.opportunityId === 'string'
            ? patch.opportunityId
            : findLineItemOpportunityId(queryClient, event.recordId);

        if (opportunityId) {
          void syncDealStage(queryClient, opportunityId);
        }
      }

      return;
    }
  }

  invalidateObjectQueries(queryClient, event.objectNameSingular);
};
