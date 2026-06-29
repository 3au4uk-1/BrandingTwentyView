import { OPPORTUNITY_DATE_FILTER_FIELD } from 'src/constants/date-filter-field';

import { buildOpportunityNodeSelection } from '../metadata/build-opportunity-selection';
import { buildOpportunityDateFilter } from '../utils/date-filters';
import {
  getEffectiveOpportunitySort,
  sortOpportunitiesWithCancelledLast,
} from '../utils/sort-opportunities';
import { asArray } from '../utils/parse-json-field';
import type { DealBoardFilters, DealBoardSort, OpportunityRow } from '../types';
import { getApiClient } from './client';
import { enrichOpportunityRowsWithLinkFields } from './opportunity-link-fields-rest';

const FETCH_ALL_PAGE_SIZE = 200;

/** Default CRM fields when callers omit dynamic selection (matches prior fixed query). */
const DEFAULT_VISIBLE_CRM_FIELD_NAMES = ['loadDate', 'stage', 'amount'];
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

const buildOpportunityFilter = (filters: DealBoardFilters) => {
  const and: Record<string, unknown>[] = [];
  const dateFilter = buildOpportunityDateFilter(filters);
  if (dateFilter) and.push(dateFilter);
  if (filters.search) and.push({ name: { ilike: `%${filters.search}%` } });
  return and.length ? { and } : undefined;
};

const fetchOpportunityPageRecords = async (params: {
  limit: number;
  offset: number;
  sort: DealBoardSort[];
  filters: DealBoardFilters;
  visibleCrmFieldNames: string[];
  linkFieldNames: readonly string[];
  includeCompanyRelation: boolean;
}): Promise<{ records: OpportunityRow[]; totalCount: number }> => {
  const client = getApiClient();
  const sort = Array.isArray(params.sort) ? params.sort : [];
  const nodeSelection = buildOpportunityNodeSelection(
    params.visibleCrmFieldNames,
    params.includeCompanyRelation,
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
        filter: buildOpportunityFilter(params.filters),
      },
      edges: { node: nodeSelection as typeof OPPORTUNITY_FIELDS },
      totalCount: true,
    },
  });

  const records = asArray<{
    node: OpportunityRow & { company?: { id?: string; name?: string }; closeDate?: string };
  }>(result.opportunities?.edges).map((e) => {
    const node = e.node;

    return {
      ...node,
      companyName: node.company?.name,
      loadDate: node.loadDate ?? node.closeDate,
    };
  });

  const enrichedRecords = await enrichOpportunityRowsWithLinkFields(records, params.linkFieldNames);

  return {
    records: enrichedRecords,
    totalCount: result.opportunities?.totalCount ?? 0,
  };
};

const fetchOpportunityPage = async (params: {
  limit: number;
  offset: number;
  sort: DealBoardSort[];
  filters: DealBoardFilters;
  visibleCrmFieldNames: string[];
  linkFieldNames: readonly string[];
  includeCompanyRelation: boolean;
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
  linkFieldNames?: readonly string[];
  includeCompanyRelation?: boolean;
  fetchAll?: boolean;
}): Promise<{ records: OpportunityRow[]; totalCount: number }> => {
  const visibleCrmFieldNames = params.visibleCrmFieldNames ?? DEFAULT_VISIBLE_CRM_FIELD_NAMES;
  const linkFieldNames = params.linkFieldNames ?? [];
  const includeCompanyRelation = params.includeCompanyRelation ?? DEFAULT_INCLUDE_COMPANY_RELATION;
  const effectiveSort = getEffectiveOpportunitySort(params.sort);

  if (!params.fetchAll) {
    return fetchOpportunityPage({
      limit: params.limit,
      offset: params.offset,
      sort: params.sort,
      filters: params.filters,
      visibleCrmFieldNames,
      linkFieldNames,
      includeCompanyRelation,
    });
  }

  const allRecords: OpportunityRow[] = [];
  let totalCount = 0;
  let offset = 0;

  do {
    const page = await fetchOpportunityPageRecords({
      limit: FETCH_ALL_PAGE_SIZE,
      offset,
      sort: params.sort,
      filters: params.filters,
      visibleCrmFieldNames,
      linkFieldNames,
      includeCompanyRelation,
    });

    totalCount = page.totalCount;
    allRecords.push(...page.records);
    offset += FETCH_ALL_PAGE_SIZE;
  } while (allRecords.length < totalCount);

  return {
    records: sortOpportunitiesWithCancelledLast(allRecords, effectiveSort),
    totalCount,
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
