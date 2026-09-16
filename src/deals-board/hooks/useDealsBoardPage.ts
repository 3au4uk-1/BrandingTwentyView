import type { QueryClient } from '@tanstack/react-query';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchDealsBoardPage,
  fetchLegacyDealsBoardPage,
} from '../api/deals-board-page';
import type { LineItemQueryFilters } from '../api/line-items';
import {
  fetchLineItemOpportunityIdsByFilters,
  fetchLineItemOpportunityIdsBySearch,
} from '../api/line-items';
import { fetchChildMatchedParentIdsBySearch } from '../api/opportunities';
import type { DealBoardFilters, DealBoardSort, LineItemRow, OpportunityRow } from '../types';
import { buildOpportunityFilter, resolveSearchTerms } from '../utils/search';
import {
  getEffectiveOpportunitySort,
  sortOpportunitiesWithCancelledLast,
} from '../utils/sort-opportunities';
import { lineItemListStatusQueryKey } from './useLineItemListStatus';
import { lineItemsQueryKey } from './useLineItems';

export type DealsBoardPageQueryData = {
  records: OpportunityRow[];
  totalCount: number;
  listStatusHydrated: boolean;
};

export const dealsBoardPageQueryKey = (
  viewId: string | undefined,
  filters: DealBoardFilters,
  sort: DealBoardSort[],
  page: number,
  visibleCrmFieldNames: string[],
  restFieldNames: readonly string[],
  includeCompanyRelation: boolean,
  fieldTypesByName: Readonly<Record<string, string>>,
  lineItemFilters?: LineItemQueryFilters,
) =>
  [
    'deals-board-page',
    viewId,
    filters,
    sort,
    page,
    visibleCrmFieldNames,
    restFieldNames,
    includeCompanyRelation,
    fieldTypesByName,
    lineItemFilters,
  ] as const;

export const flattenLineItemsFromPage = (
  lineItemsByOppId: Record<string, Array<Record<string, unknown>>>,
): LineItemRow[] => Object.values(lineItemsByOppId).flat() as LineItemRow[];

export const hydrateDealsBoardPageCache = (
  queryClient: QueryClient,
  params: {
    opportunityIds: string[];
    lineItemFilters?: LineItemQueryFilters;
    lineItemsByOppId: Record<string, Array<Record<string, unknown>>>;
    listStatusByLineItemId?: Record<string, unknown>;
  },
): void => {
  const sortedIds = [...params.opportunityIds].sort();
  const flatLineItems = flattenLineItemsFromPage(params.lineItemsByOppId);

  queryClient.setQueryData(
    lineItemsQueryKey(sortedIds, params.lineItemFilters),
    flatLineItems,
  );

  if (!params.listStatusByLineItemId) return;

  for (const [id, status] of Object.entries(params.listStatusByLineItemId)) {
    queryClient.setQueryData(lineItemListStatusQueryKey(id), status);
  }
};

export type DealsBoardPageQueryParams = {
  viewId?: string;
  filters: DealBoardFilters;
  sort: DealBoardSort[];
  page: number;
  pageSize?: number;
  visibleCrmFieldNames?: string[];
  restFieldNames?: readonly string[];
  includeCompanyRelation?: boolean;
  fieldTypesByName?: Readonly<Record<string, string>>;
  lineItemFilters?: LineItemQueryFilters;
};

export const fetchDealsBoardPageQueryData = async (
  params: DealsBoardPageQueryParams,
  queryClient: QueryClient,
): Promise<DealsBoardPageQueryData> => {
  const pageSize = params.pageSize ?? 50;
  const visibleCrmFieldNames = params.visibleCrmFieldNames ?? [];
  const restFieldNames = params.restFieldNames ?? [];
  const includeCompanyRelation = params.includeCompanyRelation ?? false;
  const fieldTypesByName = params.fieldTypesByName ?? {};
  const effectiveSort = getEffectiveOpportunitySort(params.sort);
  const lineItemFilters = params.lineItemFilters;

  const searchTerms = resolveSearchTerms(params.filters);
  const hasLineItemAttributeFilters = Boolean(
    lineItemFilters?.stages?.length || lineItemFilters?.types?.length,
  );

  let lineItemMatchedOpportunityIds: string[] | undefined;

  if (searchTerms.length) {
    const [lineItemIds, childParentIds] = await Promise.all([
      fetchLineItemOpportunityIdsBySearch(searchTerms, lineItemFilters),
      fetchChildMatchedParentIdsBySearch(searchTerms),
    ]);
    const seen = new Set<string>();
    lineItemMatchedOpportunityIds = [];
    for (const id of [...lineItemIds, ...childParentIds]) {
      if (!id || seen.has(id)) continue;
      seen.add(id);
      lineItemMatchedOpportunityIds.push(id);
    }
  } else if (hasLineItemAttributeFilters) {
    lineItemMatchedOpportunityIds = await fetchLineItemOpportunityIdsByFilters(lineItemFilters);
  }

  const opportunityFilter = buildOpportunityFilter(params.filters, lineItemMatchedOpportunityIds);
  const orderBy = effectiveSort.map((entry) => ({ [entry.field]: entry.direction }));
  const request = {
    limit: pageSize,
    offset: params.page * pageSize,
    opportunityFilter,
    orderBy,
    visibleCrmFieldNames,
    includeCompanyRelation,
    restFieldNames: [...restFieldNames],
    includeListStatus: false,
    fieldTypesByName: { ...fieldTypesByName },
  };

  const response = await fetchDealsBoardPage(request, () =>
    fetchLegacyDealsBoardPage(request, {
      sort: effectiveSort,
      filters: params.filters,
      lineItemFilters,
    }),
  );

  const records = sortOpportunitiesWithCancelledLast(
    response.opportunities as OpportunityRow[],
    effectiveSort,
  );
  const opportunityIds = records
    .map((record) => record.id)
    .filter((id): id is string => Boolean(id));

  hydrateDealsBoardPageCache(queryClient, {
    opportunityIds,
    lineItemFilters,
    lineItemsByOppId: response.lineItemsByOppId,
    listStatusByLineItemId: response.listStatusByLineItemId,
  });

  return {
    records,
    totalCount: response.totalCount,
    listStatusHydrated: false,
  };
};

export const useDealsBoardPage = (params: DealsBoardPageQueryParams & { enabled?: boolean }) => {
  const queryClient = useQueryClient();
  const effectiveSort = getEffectiveOpportunitySort(params.sort);
  const visibleCrmFieldNames = params.visibleCrmFieldNames ?? [];
  const restFieldNames = params.restFieldNames ?? [];
  const includeCompanyRelation = params.includeCompanyRelation ?? false;
  const fieldTypesByName = params.fieldTypesByName ?? {};
  const lineItemFilters = params.lineItemFilters;

  return useQuery({
    queryKey: dealsBoardPageQueryKey(
      params.viewId,
      params.filters,
      effectiveSort,
      params.page,
      visibleCrmFieldNames,
      restFieldNames,
      includeCompanyRelation,
      fieldTypesByName,
      lineItemFilters,
    ),
    queryFn: () => fetchDealsBoardPageQueryData(params, queryClient),
    enabled: params.enabled !== false,
    placeholderData: keepPreviousData,
  });
};
