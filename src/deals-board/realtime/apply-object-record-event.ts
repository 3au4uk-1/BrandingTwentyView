import type { QueryClient } from '@tanstack/react-query';

import { archiveManualLineItem } from '../api/crmparser';
import type { LineItemRow, OpportunityRow } from '../types';
import { syncDealStage } from '../utils/sync-deal-stage';
import { WATCHED_OBJECT_NAMES } from './constants';
import type { ObjectRecordEvent } from './types';

type OpportunitiesPage = {
  records: OpportunityRow[];
  totalCount: number;
};

const isWatchedObject = (objectNameSingular: string): boolean =>
  WATCHED_OBJECT_NAMES.includes(objectNameSingular as (typeof WATCHED_OBJECT_NAMES)[number]);

const patchOpportunityInCache = (
  queryClient: QueryClient,
  recordId: string,
  patch: Record<string, unknown>,
): boolean => {
  let didPatch = false;

  for (const [queryKey, page] of queryClient.getQueriesData<OpportunitiesPage>({
    queryKey: ['opportunities'],
  })) {
    if (!page?.records?.some((record) => record.id === recordId)) continue;

    queryClient.setQueryData<OpportunitiesPage>(queryKey, {
      ...page,
      records: page.records.map((record) =>
        record.id === recordId ? { ...record, ...patch } : record,
      ),
    });
    didPatch = true;
  }

  return didPatch;
};

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
    return;
  }

  if (objectNameSingular === 'dealLineItem') {
    queryClient.invalidateQueries({ queryKey: ['lineItems'] });
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

  const patch = event.properties.after;
  const canPatch =
    (event.action === 'UPDATED' || event.action === 'UPSERTED' || event.action === 'RESTORED') &&
    patch &&
    typeof patch === 'object';

  if (canPatch) {
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
