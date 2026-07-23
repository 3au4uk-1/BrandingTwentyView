import { useQuery } from '@tanstack/react-query';

import { OPPORTUNITY_DATE_FILTER_FIELD } from 'src/constants/date-filter-field';

import type { FilterClause } from '../filter-model/types';
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
  sort: DealBoardSort[],
  page: number,
  visibleCrmFieldNames: string[],
  restFieldNames: readonly string[],
  includeCompanyRelation: boolean,
  fieldTypesByName: Readonly<Record<string, string>>,
  fetchAll: boolean,
  showAll: boolean,
) =>
  [
    'opportunities',
    viewId,
    filters,
    sort,
    page,
    visibleCrmFieldNames,
    restFieldNames,
    includeCompanyRelation,
    fieldTypesByName,
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
  restFieldNames?: readonly string[];
  includeCompanyRelation?: boolean;
  fieldTypesByName?: Readonly<Record<string, string>>;
  showAll?: boolean;
  forcePaginated?: boolean;
  enabled?: boolean;
  effectiveClauses?: FilterClause[];
}) => {
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
  const visibleCrmFieldNames = params.visibleCrmFieldNames ?? [];
  const restFieldNames = params.restFieldNames ?? [];
  const includeCompanyRelation = params.includeCompanyRelation ?? false;
  const fieldTypesByName = params.fieldTypesByName ?? {};
  const showAll = params.showAll ?? false;
  const forcePaginated = params.forcePaginated ?? false;
  const effectiveSort = getEffectiveOpportunitySort(
    params.sort.length > 0 ? params.sort : DEFAULT_DATE_SORT,
  );
  const fetchAll =
    !forcePaginated &&
    (showAll ||
      shouldFetchAllOpportunities(params.filters, effectiveSort, params.effectiveClauses));

  return useQuery({
    queryKey: opportunitiesQueryKey(
      params.viewId,
      params.filters,
      effectiveSort,
      params.page,
      visibleCrmFieldNames,
      restFieldNames,
      includeCompanyRelation,
      fieldTypesByName,
      fetchAll,
      showAll,
    ),
    queryFn: async () => {
      const result = await fetchOpportunities({
        limit: pageSize,
        offset: fetchAll ? 0 : params.page * pageSize,
        sort: effectiveSort,
        filters: params.filters,
        visibleCrmFieldNames,
        restFieldNames,
        includeCompanyRelation,
        fieldTypesByName,
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
