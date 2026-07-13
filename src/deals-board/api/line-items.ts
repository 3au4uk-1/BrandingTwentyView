import { RestApiClient } from 'twenty-client-sdk/rest';

import {
  DEFAULT_MANUAL_LINE_ITEM_NAME,
  LINE_ITEM_ORIGIN,
} from 'src/constants/line-item-origin';

import type { LineItemRow } from '../types';
import { extractRestPageInfo, normalizeRestListResponse } from './rest-list';

let restClient: RestApiClient | null = null;

const PAGE_LIMIT = 200;
const OPPORTUNITY_ID_CHUNK_SIZE = 25;

export type LineItemQueryFilters = {
  stages?: string[];
  types?: string[];
};

export type CreateLineItemInput = {
  name: string;
  opportunityId: string;
  stage: 'NOVYY';
  kolichestvo: number;
  amount: {
    amountMicros: number;
    currencyCode: 'RUB';
  };
};

export const buildCreateLineItemInput = (opportunityId: string): CreateLineItemInput => ({
  name: DEFAULT_MANUAL_LINE_ITEM_NAME,
  opportunityId,
  stage: 'NOVYY',
  kolichestvo: 1,
  amount: {
    amountMicros: 0,
    currencyCode: 'RUB',
  },
});

export const isDefaultLineItemHiddenByFilters = (
  filters?: LineItemQueryFilters,
): boolean =>
  Boolean(filters?.stages?.length && !filters.stages.includes('NOVYY')) ||
  Boolean(filters?.types?.length);

export const filterLineItemsByQueryFilters = (
  items: LineItemRow[],
  filters?: LineItemQueryFilters,
): LineItemRow[] => {
  const stages = filters?.stages;
  const types = filters?.types;
  if (!stages?.length && !types?.length) return items;

  return items.filter((item) => {
    if (stages?.length && (!item.stage || !stages.includes(item.stage))) {
      return false;
    }
    if (types?.length && (!item.tip || !types.includes(item.tip))) {
      return false;
    }
    return true;
  });
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

type LineItemsRestClient = Pick<RestApiClient, 'get'>;

const fetchLineItemsPage = async (
  client: LineItemsRestClient,
  opportunityIds: string[],
  after?: string,
): Promise<{ items: LineItemRow[]; nextCursor?: string }> => {
  const response = await client.get<unknown>('/rest/dealLineItems', {
    query: buildDealLineItemsQuery(opportunityIds, undefined, after),
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
  client: LineItemsRestClient,
  opportunityIds: string[],
): Promise<LineItemRow[]> => {
  const allItems: LineItemRow[] = [];
  let after: string | undefined;

  do {
    const page = await fetchLineItemsPage(client, opportunityIds, after);
    allItems.push(...page.items);
    after = page.nextCursor;
  } while (after);

  return allItems;
};

const isRetryableBatchError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' && status >= 500;
};

export const fetchLineItemsForOpportunityIdsWithClient = async (
  client: LineItemsRestClient,
  opportunityIds: string[],
): Promise<LineItemRow[]> => {
  try {
    return await fetchLineItemsForOpportunityChunk(client, opportunityIds);
  } catch (error) {
    if (opportunityIds.length <= 1 || !isRetryableBatchError(error)) {
      throw error;
    }

    const middle = Math.ceil(opportunityIds.length / 2);
    const left = await fetchLineItemsForOpportunityIdsWithClient(
      client,
      opportunityIds.slice(0, middle),
    );
    const right = await fetchLineItemsForOpportunityIdsWithClient(
      client,
      opportunityIds.slice(middle),
    );

    return [...left, ...right];
  }
};

export const fetchLineItemsByOpportunityIds = async (
  opportunityIds: string[],
  filters?: LineItemQueryFilters,
): Promise<LineItemRow[]> => {
  if (opportunityIds.length === 0) return [];

  const client = getRestClient();
  const chunks = chunkOpportunityIds(opportunityIds, OPPORTUNITY_ID_CHUNK_SIZE);
  const chunkResults = await Promise.all(
    chunks.map((chunk) => fetchLineItemsForOpportunityIdsWithClient(client, chunk)),
  );

  return filterLineItemsByQueryFilters(chunkResults.flat(), filters);
};

const fetchLineItemOpportunityIdsPage = async (
  client: RestApiClient,
  search: string,
  filters: LineItemQueryFilters | undefined,
  after?: string,
): Promise<{ opportunityIds: string[]; nextCursor?: string }> => {
  const response = await client.get<unknown>('/rest/dealLineItems', {
    query: buildDealLineItemsSearchQuery(search, undefined, after),
  });

  const items = filterLineItemsByQueryFilters(
    normalizeLineItemRows(
      normalizeRestListResponse<unknown>(response, 'dealLineItems'),
    ),
    filters,
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

type LineItemCreateClient = Pick<RestApiClient, 'post' | 'patch'>;

export const extractCreatedLineItemId = (response: unknown): string => {
  if (!response || typeof response !== 'object') {
    throw new Error('Created line item response missing id');
  }

  const candidates: unknown[] = [
    (response as { id?: unknown }).id,
  ];

  const data = (response as { data?: unknown }).data;
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    candidates.push(record.id);
    const nested = record.dealLineItem;
    if (nested && typeof nested === 'object') {
      candidates.push((nested as { id?: unknown }).id);
    }
  }

  const topLevelRecord = (response as { dealLineItem?: unknown }).dealLineItem;
  if (topLevelRecord && typeof topLevelRecord === 'object') {
    candidates.push((topLevelRecord as { id?: unknown }).id);
  }

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.length > 0) {
      return candidate;
    }
  }

  throw new Error('Created line item response missing id');
};

export const createLineItemWithClient = async (
  client: LineItemCreateClient,
  opportunityId: string,
): Promise<string> => {
  const response = await client.post<unknown>(
    '/rest/dealLineItems',
    buildCreateLineItemInput(opportunityId),
  );
  const id = extractCreatedLineItemId(response);

  await client.patch(`/rest/dealLineItems/${id}`, {
    istochnik: LINE_ITEM_ORIGIN.TWENTY_MANUAL,
  });

  return id;
};

export const createLineItem = async (opportunityId: string): Promise<string> => {
  return createLineItemWithClient(getRestClient(), opportunityId);
};
