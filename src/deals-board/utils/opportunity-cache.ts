import type { QueryClient } from '@tanstack/react-query';

import type { LineItemRow, OpportunityRow } from '../types';

type OpportunitiesPage = {
  records: OpportunityRow[];
  totalCount?: number;
};

/** Query roots that hold paginated opportunity lists on the board. */
export const OPPORTUNITY_PAGE_QUERY_ROOTS = ['opportunities', 'deals-board-page'] as const;

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

export const findOpportunityInCache = (
  queryClient: QueryClient,
  opportunityId: string,
): OpportunityRow | undefined => {
  for (const root of OPPORTUNITY_PAGE_QUERY_ROOTS) {
    for (const [, page] of queryClient.getQueriesData<OpportunitiesPage>({
      queryKey: [root],
    })) {
      const match = page?.records?.find((record) => record.id === opportunityId);
      if (match) return match;
    }
  }

  return undefined;
};

export const patchOpportunityInCache = (
  queryClient: QueryClient,
  opportunityId: string,
  patch: Record<string, unknown>,
): boolean => {
  let didPatch = false;

  for (const root of OPPORTUNITY_PAGE_QUERY_ROOTS) {
    for (const [queryKey, page] of queryClient.getQueriesData<OpportunitiesPage>({
      queryKey: [root],
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
  }

  return didPatch;
};
