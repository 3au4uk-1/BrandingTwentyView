import type { QueryClient } from '@tanstack/react-query';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchDealsBoardPage,
  fetchLegacyDealsBoardPage,
} from '../api/deals-board-page';
import type { LineItemQueryFilters } from '../api/line-items';
import { fetchLineItemOpportunityIdsBySearch } from '../api/line-items';
import { isCrmparserConfigured } from '../api/crmparser';
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

export const useDealsBoardPage = (params: {
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
  enabled?: boolean;
}) => {
  const queryClient = useQueryClient();
  const pageSize = params.pageSize ?? 50;
  const visibleCrmFieldNames = params.visibleCrmFieldNames ?? [];
  const restFieldNames = params.restFieldNames ?? [];
  const includeCompanyRelation = params.includeCompanyRelation ?? false;
  const fieldTypesByName = params.fieldTypesByName ?? {};
  const effectiveSort = getEffectiveOpportunitySort(params.sort);
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
    queryFn: async (): Promise<DealsBoardPageQueryData> => {
      const searchTerms = resolveSearchTerms(params.filters);
      const lineItemMatchedOpportunityIds = searchTerms.length
        ? await fetchLineItemOpportunityIdsBySearch(searchTerms, lineItemFilters)
        : undefined;
      const opportunityFilter = buildOpportunityFilter(
        params.filters,
        lineItemMatchedOpportunityIds,
      );
      const orderBy = effectiveSort.map((entry) => ({ [entry.field]: entry.direction }));
      const includeListStatus = isCrmparserConfigured();

      const request = {
        limit: pageSize,
        offset: params.page * pageSize,
        opportunityFilter,
        orderBy,
        visibleCrmFieldNames,
        includeCompanyRelation,
        restFieldNames: [...restFieldNames],
        includeListStatus,
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
        listStatusHydrated:
          includeListStatus &&
          Boolean(response.listStatusByLineItemId) &&
          Object.keys(response.listStatusByLineItemId ?? {}).length > 0,
      };
    },
    enabled: params.enabled !== false,
    placeholderData: keepPreviousData,
  });
};
