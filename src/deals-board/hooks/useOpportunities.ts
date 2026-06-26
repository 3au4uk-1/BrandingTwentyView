import { useQuery } from '@tanstack/react-query';

import { fetchOpportunities } from '../api/opportunities';
import type { DealBoardFilters, DealBoardSort } from '../types';

const DEFAULT_PAGE_SIZE = 50;

export const opportunitiesQueryKey = (
  viewId: string | undefined,
  filters: DealBoardFilters,
  page: number,
) => ['opportunities', viewId, filters, page] as const;

export const useOpportunities = (params: {
  viewId?: string;
  filters: DealBoardFilters;
  sort: DealBoardSort[];
  page: number;
  pageSize?: number;
  enabled?: boolean;
}) => {
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;

  return useQuery({
    queryKey: opportunitiesQueryKey(params.viewId, params.filters, params.page),
    queryFn: () =>
      fetchOpportunities({
        limit: pageSize,
        offset: params.page * pageSize,
        sort: params.sort,
        filters: params.filters,
      }),
    enabled: params.enabled !== false,
  });
};
