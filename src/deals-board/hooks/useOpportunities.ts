import { useQuery } from '@tanstack/react-query';

import { OPPORTUNITY_DATE_FILTER_FIELD } from 'src/constants/date-filter-field';

import { fetchOpportunities } from '../api/opportunities';
import { shouldFetchAllOpportunities } from '../utils/date-filters';
import { getEffectiveOpportunitySort } from '../utils/sort-opportunities';
import type { DealBoardFilters, DealBoardSort } from '../types';

const DEFAULT_PAGE_SIZE = 50;
const DEFAULT_DATE_SORT: DealBoardSort[] = [
  { field: OPPORTUNITY_DATE_FILTER_FIELD, direction: 'AscNullsFirst' },
];

export const opportunitiesQueryKey = (
  viewId: string | undefined,
  filters: DealBoardFilters,
  page: number,
  visibleCrmFieldNames: string[],
  linkFieldNames: readonly string[],
  includeCompanyRelation: boolean,
  fetchAll: boolean,
  showAll: boolean,
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
    showAll,
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
  showAll?: boolean;
  enabled?: boolean;
}) => {
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
  const visibleCrmFieldNames = params.visibleCrmFieldNames ?? [];
  const linkFieldNames = params.linkFieldNames ?? [];
  const includeCompanyRelation = params.includeCompanyRelation ?? false;
  const showAll = params.showAll ?? false;
  const effectiveSort = getEffectiveOpportunitySort(
    params.sort.length > 0 ? params.sort : DEFAULT_DATE_SORT,
  );
  const fetchAll =
    showAll || shouldFetchAllOpportunities(params.filters, effectiveSort);

  return useQuery({
    queryKey: opportunitiesQueryKey(
      params.viewId,
      params.filters,
      params.page,
      visibleCrmFieldNames,
      linkFieldNames,
      includeCompanyRelation,
      fetchAll,
      showAll,
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

      if (showAll || !fetchAll) {
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
