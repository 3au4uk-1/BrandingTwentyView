import type { QueryClient } from '@tanstack/react-query';

import type { LineItemRow, OpportunityRow } from '../types';

type OpportunitiesPage = {
  records: OpportunityRow[];
  totalCount: number;
};

export const findLineItemOpportunityId = (
  queryClient: QueryClient,
  lineItemId: string,
): string | undefined => {
  for (const [, items] of queryClient.getQueriesData<LineItemRow[]>({
    queryKey: ['lineItems'],
  })) {
    const match = items?.find((item) => item.id === lineItemId);
    if (match?.opportunityId) return match.opportunityId;
  }

  return undefined;
};

export const patchOpportunityInCache = (
  queryClient: QueryClient,
  opportunityId: string,
  patch: Record<string, unknown>,
): boolean => {
  let didPatch = false;

  for (const [queryKey, page] of queryClient.getQueriesData<OpportunitiesPage>({
    queryKey: ['opportunities'],
  })) {
    if (!page?.records?.some((record) => record.id === opportunityId)) continue;

    queryClient.setQueryData<OpportunitiesPage>(queryKey, {
      ...page,
      records: page.records.map((record) =>
        record.id === opportunityId ? { ...record, ...patch } : record,
      ),
    });
    didPatch = true;
  }

  return didPatch;
};
