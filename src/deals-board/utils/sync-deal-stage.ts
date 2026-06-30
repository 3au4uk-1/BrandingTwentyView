import type { QueryClient } from '@tanstack/react-query';

import { patchOpportunity } from '../api/opportunities';
import type { LineItemRow, OpportunityRow } from '../types';
import { computeDealStage } from './compute-deal-stage';

type OpportunitiesPage = {
  records: OpportunityRow[];
  totalCount: number;
};

export const findLineItemsForOpportunity = (
  queryClient: QueryClient,
  opportunityId: string,
): LineItemRow[] => {
  const results: LineItemRow[] = [];

  for (const [, items] of queryClient.getQueriesData<LineItemRow[]>({
    queryKey: ['lineItems'],
  })) {
    if (items) {
      results.push(...items.filter((item) => item.opportunityId === opportunityId));
    }
  }

  return results;
};

export const findOpportunityInCache = (
  queryClient: QueryClient,
  opportunityId: string,
): OpportunityRow | undefined => {
  for (const [, page] of queryClient.getQueriesData<OpportunitiesPage>({
    queryKey: ['opportunities'],
  })) {
    const match = page?.records.find((record) => record.id === opportunityId);
    if (match) return match;
  }

  return undefined;
};

export const syncDealStage = async (
  queryClient: QueryClient,
  opportunityId: string,
): Promise<void> => {
  const opportunity = findOpportunityInCache(queryClient, opportunityId);
  if (!opportunity || opportunity.stageZakreplen === true) return;

  const lineItems = findLineItemsForOpportunity(queryClient, opportunityId);
  const nextStage = computeDealStage(lineItems);
  if (nextStage === opportunity.stage) return;

  await patchOpportunity(opportunityId, { stage: nextStage });

  for (const [queryKey, page] of queryClient.getQueriesData<OpportunitiesPage>({
    queryKey: ['opportunities'],
  })) {
    if (!page?.records) continue;

    queryClient.setQueryData<OpportunitiesPage>(queryKey, {
      ...page,
      records: page.records.map((record) =>
        record.id === opportunityId ? { ...record, stage: nextStage } : record,
      ),
    });
  }
};
