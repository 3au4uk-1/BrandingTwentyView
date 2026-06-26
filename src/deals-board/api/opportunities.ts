import { getApiClient } from './client';
import type { DealBoardFilters, DealBoardSort, OpportunityRow } from '../types';

const OPPORTUNITY_FIELDS = {
  id: true,
  name: true,
  loadDate: true,
  companyId: true,
  company: { id: true, name: true },
  amount: { amountMicros: true, currencyCode: true },
  tonyLink: { primaryLinkUrl: true, primaryLinkLabel: true },
  bitrixLink: { primaryLinkUrl: true, primaryLinkLabel: true },
  oplata: true,
} as const;

const buildOpportunityFilter = (filters: DealBoardFilters) => {
  const and: Record<string, unknown>[] = [];
  if (filters.dateFrom) and.push({ loadDate: { gte: filters.dateFrom } });
  if (filters.dateTo) and.push({ loadDate: { lte: filters.dateTo } });
  if (filters.oplata) and.push({ oplata: { eq: filters.oplata } });
  if (filters.search) and.push({ name: { ilike: `%${filters.search}%` } });
  return and.length ? { and } : undefined;
};

export const fetchOpportunities = async (params: {
  limit: number;
  offset: number;
  sort: DealBoardSort[];
  filters: DealBoardFilters;
}): Promise<{ records: OpportunityRow[]; totalCount: number }> => {
  const client = getApiClient();
  const sort = Array.isArray(params.sort) ? params.sort : [];
  const orderBy = sort.length
    ? sort.map((s) => ({ [s.field]: s.direction }))
    : [{ loadDate: 'AscNullsFirst' as const }];

  const result = await client.query({
    opportunities: {
      __args: {
        first: params.limit,
        offset: params.offset,
        orderBy,
        filter: buildOpportunityFilter(params.filters),
      },
      edges: { node: OPPORTUNITY_FIELDS },
      totalCount: true,
    },
  });

  const records = (result.opportunities?.edges ?? []).map((e) => {
    const node = e.node as OpportunityRow & {
      company?: { id?: string; name?: string };
    };

    return {
      ...node,
      companyName: node.company?.name,
    };
  });
  return { records, totalCount: result.opportunities?.totalCount ?? 0 };
};
