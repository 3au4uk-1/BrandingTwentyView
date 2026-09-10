import { OPPORTUNITY_DATE_FILTER_FIELD } from 'src/constants/date-filter-field';

import { buildOpportunityNodeSelection } from '../metadata/build-opportunity-selection';
import { buildOpportunityFilter, resolveSearchTerms } from '../utils/search';
import { opportunityMatchesDateFilter } from '../utils/resolve-opportunity-date';
import { fetchLineItemOpportunityIdsBySearch } from './line-items';
import {
  getEffectiveOpportunitySort,
  sortOpportunitiesWithCancelledLast,
} from '../utils/sort-opportunities';
import { asArray } from '../utils/parse-json-field';
import type { DealBoardFilters, DealBoardSort, OpportunityRow } from '../types';
import { getApiClient } from './client';
import { enrichOpportunityRowsWithRestFields } from './opportunity-link-fields-rest';

const FETCH_ALL_PAGE_SIZE = 200;

/** Default CRM fields when callers omit dynamic selection (matches prior fixed query). */
const DEFAULT_VISIBLE_CRM_FIELD_NAMES = ['loadDate', 'stage', 'stageZakreplen', 'amount'];
const DEFAULT_INCLUDE_COMPANY_RELATION = true;

/** Minimal shape retained for GraphQL node selection typing. */
const OPPORTUNITY_FIELDS = {
  id: true,
  name: true,
  companyId: true,
  company: { id: true, name: true },
  amount: { amountMicros: true, currencyCode: true },
  stage: true,
  loadDate: true,
} as const;

const fetchOpportunityPageRecords = async (params: {
  limit: number;
  offset: number;
  sort: DealBoardSort[];
  filters: DealBoardFilters;
  lineItemMatchedOpportunityIds?: string[];
  visibleCrmFieldNames: string[];
  restFieldNames: readonly string[];
  includeCompanyRelation: boolean;
  fieldTypesByName?: Readonly<Record<string, string>>;
}): Promise<{ records: OpportunityRow[]; totalCount: number; fetchedCount: number }> => {
  const client = getApiClient();
  const sort = Array.isArray(params.sort) ? params.sort : [];
  const nodeSelection = buildOpportunityNodeSelection(
    params.visibleCrmFieldNames,
    params.includeCompanyRelation,
    params.fieldTypesByName,
  );

  const orderBy = sort.length
    ? sort.map((s) => ({ [s.field]: s.direction }))
    : [{ [OPPORTUNITY_DATE_FILTER_FIELD]: 'AscNullsFirst' as const }];

  const result = await client.query({
    opportunities: {
      __args: {
        first: params.limit,
        offset: params.offset,
        orderBy,
        filter: buildOpportunityFilter(params.filters, params.lineItemMatchedOpportunityIds),
      },
      edges: { node: nodeSelection as typeof OPPORTUNITY_FIELDS },
      totalCount: true,
    },
  });

  const edges = asArray<{
    node: OpportunityRow & { company?: { id?: string; name?: string }; closeDate?: string };
  }>(result.opportunities?.edges);

  const records = edges
    .map((e) => e.node)
    .filter((node) => opportunityMatchesDateFilter(node, params.filters))
    .map((node) => ({
      ...node,
      companyName: node.company?.name,
      loadDate: node.loadDate ?? node.closeDate,
    }));

  const enrichedRecords = await enrichOpportunityRowsWithRestFields(records, params.restFieldNames);

  return {
    records: enrichedRecords,
    totalCount: result.opportunities?.totalCount ?? 0,
    fetchedCount: edges.length,
  };
};

const fetchOpportunityPage = async (params: {
  limit: number;
  offset: number;
  sort: DealBoardSort[];
  filters: DealBoardFilters;
  lineItemMatchedOpportunityIds?: string[];
  visibleCrmFieldNames: string[];
  restFieldNames: readonly string[];
  includeCompanyRelation: boolean;
  fieldTypesByName?: Readonly<Record<string, string>>;
}): Promise<{ records: OpportunityRow[]; totalCount: number }> => {
  const { records, totalCount } = await fetchOpportunityPageRecords(params);

  return {
    records: sortOpportunitiesWithCancelledLast(records, getEffectiveOpportunitySort(params.sort)),
    totalCount,
  };
};

export const fetchOpportunities = async (params: {
  limit: number;
  offset: number;
  sort: DealBoardSort[];
  filters: DealBoardFilters;
  visibleCrmFieldNames?: string[];
  restFieldNames?: readonly string[];
  includeCompanyRelation?: boolean;
  fieldTypesByName?: Readonly<Record<string, string>>;
  fetchAll?: boolean;
}): Promise<{ records: OpportunityRow[]; totalCount: number }> => {
  const visibleCrmFieldNames = params.visibleCrmFieldNames ?? DEFAULT_VISIBLE_CRM_FIELD_NAMES;
  const restFieldNames = params.restFieldNames ?? [];
  const includeCompanyRelation = params.includeCompanyRelation ?? DEFAULT_INCLUDE_COMPANY_RELATION;
  const fieldTypesByName = params.fieldTypesByName ?? { amount: 'CURRENCY' };
  const effectiveSort = getEffectiveOpportunitySort(params.sort);
  const searchTerms = resolveSearchTerms(params.filters);
  const lineItemSearchFilters =
    params.filters.lineItemStages?.length || params.filters.types?.length
      ? { stages: params.filters.lineItemStages, types: params.filters.types }
      : undefined;
  const lineItemMatchedOpportunityIds = searchTerms.length
    ? await fetchLineItemOpportunityIdsBySearch(searchTerms, lineItemSearchFilters)
    : undefined;

  if (!params.fetchAll) {
    return fetchOpportunityPage({
      limit: params.limit,
      offset: params.offset,
      sort: params.sort,
      filters: params.filters,
      lineItemMatchedOpportunityIds,
      visibleCrmFieldNames,
      restFieldNames,
      includeCompanyRelation,
      fieldTypesByName,
    });
  }

  const allRecords: OpportunityRow[] = [];
  let serverTotalCount = 0;
  let offset = 0;

  while (offset < serverTotalCount || offset === 0) {
    const page = await fetchOpportunityPageRecords({
      limit: FETCH_ALL_PAGE_SIZE,
      offset,
      sort: params.sort,
      filters: params.filters,
      lineItemMatchedOpportunityIds,
      visibleCrmFieldNames,
      restFieldNames,
      includeCompanyRelation,
      fieldTypesByName,
    });

    serverTotalCount = page.totalCount;
    allRecords.push(...page.records);
    offset += page.fetchedCount;

    if (page.fetchedCount === 0) {
      break;
    }
  }

  return {
    records: sortOpportunitiesWithCancelledLast(allRecords, effectiveSort),
    totalCount: allRecords.length,
  };
};

export const patchOpportunity = async (
  id: string,
  data: Record<string, unknown>,
): Promise<void> => {
  const client = getApiClient();
  await client.mutation({
    updateOpportunity: {
      __args: { id, data },
      id: true,
    },
  });
};
