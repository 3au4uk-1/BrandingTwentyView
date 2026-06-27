import { useQuery } from '@tanstack/react-query';

import { fetchOpportunities } from '../api/opportunities';
import { shouldFetchAllOpportunities } from '../utils/date-filters';
import type { DealBoardFilters, DealBoardSort } from '../types';

const DEFAULT_PAGE_SIZE = 50;

export const opportunitiesQueryKey = (
  viewId: string | undefined,
  filters: DealBoardFilters,
  page: number,
  visibleCrmFieldNames: string[],
  linkFieldNames: readonly string[],
  includeCompanyRelation: boolean,
  fetchAll: boolean,
) =>
  [
    'opportunities',
    viewId,
    filters,
    page,
    visibleCrmFieldNames,
    linkFieldNames,
    includeCompanyRelation,
    fetchAll,
  ] as const;

export const useOpportunities = (params: {
  viewId?: string;
  filters: DealBoardFilters;
  sort: DealBoardSort[];
  page: number;
  pageSize?: number;
  visibleCrmFieldNames?: string[];
  linkFieldNames?: readonly string[];
  includeCompanyRelation?: boolean;
  enabled?: boolean;
}) => {
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
  const visibleCrmFieldNames = params.visibleCrmFieldNames ?? [];
  const linkFieldNames = params.linkFieldNames ?? [];
  const includeCompanyRelation = params.includeCompanyRelation ?? false;
  const fetchAll = shouldFetchAllOpportunities(params.filters);

  return useQuery({
    queryKey: opportunitiesQueryKey(
      params.viewId,
      params.filters,
      params.page,
      visibleCrmFieldNames,
      linkFieldNames,
      includeCompanyRelation,
      fetchAll,
    ),
    queryFn: async () => {
      const result = await fetchOpportunities({
        limit: pageSize,
        offset: fetchAll ? 0 : params.page * pageSize,
        sort: params.sort,
        filters: params.filters,
        visibleCrmFieldNames,
        linkFieldNames,
        includeCompanyRelation,
        fetchAll,
      });

      if (!fetchAll) {
        return result;
      }

      const start = params.page * pageSize;
      return {
        records: result.records.slice(start, start + pageSize),
        totalCount: result.totalCount,
      };
    },
    enabled: params.enabled !== false,
  });
};
