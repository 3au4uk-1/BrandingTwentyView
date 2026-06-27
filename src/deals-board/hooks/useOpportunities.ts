import { useQuery } from '@tanstack/react-query';

import { fetchOpportunities } from '../api/opportunities';
import type { DealBoardFilters, DealBoardSort } from '../types';

const DEFAULT_PAGE_SIZE = 50;

export const opportunitiesQueryKey = (
  viewId: string | undefined,
  filters: DealBoardFilters,
  page: number,
  visibleCrmFieldNames: string[],
  includeCompanyRelation: boolean,
) => ['opportunities', viewId, filters, page, visibleCrmFieldNames, includeCompanyRelation] as const;

export const useOpportunities = (params: {
  viewId?: string;
  filters: DealBoardFilters;
  sort: DealBoardSort[];
  page: number;
  pageSize?: number;
  visibleCrmFieldNames?: string[];
  includeCompanyRelation?: boolean;
  enabled?: boolean;
}) => {
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
  const visibleCrmFieldNames = params.visibleCrmFieldNames ?? [];
  const includeCompanyRelation = params.includeCompanyRelation ?? false;

  return useQuery({
    queryKey: opportunitiesQueryKey(
      params.viewId,
      params.filters,
      params.page,
      visibleCrmFieldNames,
      includeCompanyRelation,
    ),
    queryFn: () =>
      fetchOpportunities({
        limit: pageSize,
        offset: params.page * pageSize,
        sort: params.sort,
        filters: params.filters,
        visibleCrmFieldNames,
        includeCompanyRelation,
      }),
    enabled: params.enabled !== false,
  });
};
