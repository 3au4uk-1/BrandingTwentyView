import { RestApiClient } from 'twenty-client-sdk/rest';

import type { LineItemRow } from '../types';
import { extractRestPageInfo, normalizeRestListResponse } from './rest-list';

let restClient: RestApiClient | null = null;

const PAGE_LIMIT = 200;
const OPPORTUNITY_ID_CHUNK_SIZE = 25;

export type LineItemQueryFilters = {
  stages?: string[];
  types?: string[];
};

const getRestClient = (): RestApiClient => {
  if (!restClient) restClient = new RestApiClient();
  return restClient;
};

const appendLineItemFilters = (
  baseFilter: string,
  filters?: LineItemQueryFilters,
): string => {
  const parts: string[] = [];

  if (filters?.stages?.length) {
    parts.push(`stage[in]:${JSON.stringify(filters.stages)}`);
  }
  if (filters?.types?.length) {
    parts.push(`tip[in]:${JSON.stringify(filters.types)}`);
  }

  if (!parts.length) return baseFilter;
  return `and(${baseFilter},${parts.join(',')})`;
};

export const buildDealLineItemsFilter = (
  opportunityIds: string[],
  filters?: LineItemQueryFilters,
): string => {
  const opportunityFilter = `opportunityId[in]:${JSON.stringify(opportunityIds)}`;
  return appendLineItemFilters(opportunityFilter, filters);
};

export const buildDealLineItemsSearchFilter = (
  search: string,
  filters?: LineItemQueryFilters,
): string => {
  const pattern = `%${search.trim()}%`;
  const nameFilter = `name[ilike]:${JSON.stringify(pattern)}`;
  return appendLineItemFilters(nameFilter, filters);
};

export const buildDealLineItemsSearchQuery = (
  search: string,
  filters?: LineItemQueryFilters,
  after?: string,
): Record<string, string | number> => {
  const query: Record<string, string | number> = {
    limit: PAGE_LIMIT,
    filter: buildDealLineItemsSearchFilter(search, filters),
  };
  if (after) query.after = after;
  return query;
};

export const buildDealLineItemsQuery = (
  opportunityIds: string[],
  filters?: LineItemQueryFilters,
  after?: string,
): Record<string, string | number> => {
  const query: Record<string, string | number> = {
    limit: PAGE_LIMIT,
    filter: buildDealLineItemsFilter(opportunityIds, filters),
  };
  if (after) query.after = after;
  return query;
};

const chunkOpportunityIds = (opportunityIds: string[], chunkSize: number): string[][] => {
  const chunks: string[][] = [];
  for (let index = 0; index < opportunityIds.length; index += chunkSize) {
    chunks.push(opportunityIds.slice(index, index + chunkSize));
  }
  return chunks;
};

const normalizeLineItemRow = (raw: unknown): LineItemRow | null => {
  if (!raw || typeof raw !== 'object') return null;

  const item = raw as Record<string, unknown> & Partial<LineItemRow>;
  if (typeof item.id !== 'string' || typeof item.name !== 'string') return null;

  let opportunityId = typeof item.opportunityId === 'string' ? item.opportunityId : '';
  if (!opportunityId && item.opportunity && typeof item.opportunity === 'object') {
    const nestedId = (item.opportunity as { id?: string }).id;
    if (typeof nestedId === 'string') opportunityId = nestedId;
  }

  if (!opportunityId) return null;

  return {
    ...item,
    id: item.id,
    name: item.name,
    opportunityId,
  };
};

const normalizeLineItemRows = (items: unknown[]): LineItemRow[] =>
  items
    .map(normalizeLineItemRow)
    .filter((item): item is LineItemRow => item !== null);

const fetchLineItemsPage = async (
  client: RestApiClient,
  opportunityIds: string[],
  filters?: LineItemQueryFilters,
  after?: string,
): Promise<{ items: LineItemRow[]; nextCursor?: string }> => {
  const response = await client.get<unknown>('/rest/dealLineItems', {
    query: buildDealLineItemsQuery(opportunityIds, filters, after),
  });

  const items = normalizeLineItemRows(
    normalizeRestListResponse<unknown>(response, 'dealLineItems'),
  );
  const pageInfo = extractRestPageInfo(response);
  const nextCursor =
    pageInfo.hasNextPage && pageInfo.endCursor ? String(pageInfo.endCursor) : undefined;

  return { items, nextCursor };
};

const fetchLineItemsForOpportunityChunk = async (
  client: RestApiClient,
  opportunityIds: string[],
  filters?: LineItemQueryFilters,
): Promise<LineItemRow[]> => {
  const allItems: LineItemRow[] = [];
  let after: string | undefined;

  do {
    const page = await fetchLineItemsPage(client, opportunityIds, filters, after);
    allItems.push(...page.items);
    after = page.nextCursor;
  } while (after);

  return allItems;
};

export const fetchLineItemsByOpportunityIds = async (
  opportunityIds: string[],
  filters?: LineItemQueryFilters,
): Promise<LineItemRow[]> => {
  if (opportunityIds.length === 0) return [];

  const client = getRestClient();
  const chunks = chunkOpportunityIds(opportunityIds, OPPORTUNITY_ID_CHUNK_SIZE);
  const chunkResults = await Promise.all(
    chunks.map((chunk) => fetchLineItemsForOpportunityChunk(client, chunk, filters)),
  );

  return chunkResults.flat();
};

const fetchLineItemOpportunityIdsPage = async (
  client: RestApiClient,
  search: string,
  filters?: LineItemQueryFilters,
  after?: string,
): Promise<{ opportunityIds: string[]; nextCursor?: string }> => {
  const response = await client.get<unknown>('/rest/dealLineItems', {
    query: buildDealLineItemsSearchQuery(search, filters, after),
  });

  const items = normalizeLineItemRows(
    normalizeRestListResponse<unknown>(response, 'dealLineItems'),
  );
  const opportunityIds = [...new Set(items.map((item) => item.opportunityId))];
  const pageInfo = extractRestPageInfo(response);
  const nextCursor =
    pageInfo.hasNextPage && pageInfo.endCursor ? String(pageInfo.endCursor) : undefined;

  return { opportunityIds, nextCursor };
};

export const fetchLineItemOpportunityIdsBySearch = async (
  search: string,
  filters?: LineItemQueryFilters,
): Promise<string[]> => {
  const term = search.trim();
  if (!term) return [];

  const client = getRestClient();
  const allIds = new Set<string>();
  let after: string | undefined;

  do {
    const page = await fetchLineItemOpportunityIdsPage(client, term, filters, after);
    page.opportunityIds.forEach((id) => allIds.add(id));
    after = page.nextCursor;
  } while (after);

  return [...allIds];
};

export const updateLineItem = async (
  id: string,
  data: Record<string, unknown>,
): Promise<void> => {
  const client = getRestClient();
  await client.patch(`/rest/dealLineItems/${id}`, data);
};
