import { RestApiClient } from 'twenty-client-sdk/rest';

import type { LineItemRowLike } from './deals-board-page-types';

const PAGE_LIMIT = 200;
const OPPORTUNITY_ID_CHUNK_SIZE = 25;
const REST_ENRICH_CHUNK_SIZE = 50;

type RestPageInfo = {
  hasNextPage?: boolean;
  endCursor?: string | null;
};

const normalizeRestListResponse = <T>(response: unknown, collectionKey: string): T[] => {
  if (Array.isArray(response)) return response;

  if (!response || typeof response !== 'object') return [];

  const body = response as Record<string, unknown>;
  const data = body.data;

  if (Array.isArray(data)) return data as T[];

  if (data && typeof data === 'object') {
    const nested = (data as Record<string, unknown>)[collectionKey];
    if (Array.isArray(nested)) return nested as T[];
  }

  const topLevel = body[collectionKey];
  if (Array.isArray(topLevel)) return topLevel as T[];

  return [];
};

const extractRestPageInfo = (response: unknown): RestPageInfo => {
  if (!response || typeof response !== 'object') return {};

  const pageInfo = (response as Record<string, unknown>).pageInfo;
  if (!pageInfo || typeof pageInfo !== 'object') return {};

  return pageInfo as RestPageInfo;
};

const chunkIds = (ids: string[], chunkSize: number): string[][] => {
  const chunks: string[][] = [];
  for (let index = 0; index < ids.length; index += chunkSize) {
    chunks.push(ids.slice(index, index + chunkSize));
  }
  return chunks;
};

const buildDealLineItemsFilter = (opportunityIds: string[]): string =>
  `opportunityId[in]:${JSON.stringify(opportunityIds)}`;

const buildDealLineItemsQuery = (
  opportunityIds: string[],
  after?: string,
): Record<string, string | number> => {
  const query: Record<string, string | number> = {
    limit: PAGE_LIMIT,
    depth: 1,
    filter: buildDealLineItemsFilter(opportunityIds),
  };
  if (after) query.after = after;
  return query;
};

const normalizeLineItemRow = (raw: unknown): LineItemRowLike | null => {
  if (!raw || typeof raw !== 'object') return null;

  const item = raw as Record<string, unknown>;
  if (typeof item.id !== 'string') return null;

  let opportunityId = typeof item.opportunityId === 'string' ? item.opportunityId : '';
  if (!opportunityId && item.opportunity && typeof item.opportunity === 'object') {
    const nestedId = (item.opportunity as { id?: string }).id;
    if (typeof nestedId === 'string') opportunityId = nestedId;
  }

  if (!opportunityId) return null;

  const nestedSupplier = item.supplier;
  const nestedSupplierId =
    nestedSupplier &&
    typeof nestedSupplier === 'object' &&
    typeof (nestedSupplier as { id?: unknown }).id === 'string' &&
    typeof (nestedSupplier as { name?: unknown }).name === 'string'
      ? (nestedSupplier as { id: string }).id
      : undefined;

  return {
    ...item,
    id: item.id,
    opportunityId,
    ...(nestedSupplierId !== undefined ? { supplierId: nestedSupplierId } : {}),
  } as LineItemRowLike;
};

const normalizeLineItemRows = (items: unknown[]): Array<Record<string, unknown>> =>
  items
    .map(normalizeLineItemRow)
    .filter((item): item is LineItemRowLike => item !== null);

type LineItemsRestClient = Pick<RestApiClient, 'get'>;

const fetchLineItemsPage = async (
  client: LineItemsRestClient,
  opportunityIds: string[],
  after?: string,
): Promise<{ items: Array<Record<string, unknown>>; nextCursor?: string }> => {
  const response = await client.get<unknown>('/rest/dealLineItems', {
    query: buildDealLineItemsQuery(opportunityIds, after),
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
): Promise<Array<Record<string, unknown>>> => {
  const allItems: Array<Record<string, unknown>> = [];
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

const fetchLineItemsForOpportunityIdsWithClient = async (
  client: LineItemsRestClient,
  opportunityIds: string[],
): Promise<Array<Record<string, unknown>>> => {
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
  client: RestApiClient,
  opportunityIds: string[],
): Promise<Array<Record<string, unknown>>> => {
  if (opportunityIds.length === 0) return [];

  const chunks = chunkIds(opportunityIds, OPPORTUNITY_ID_CHUNK_SIZE);
  const chunkResults = await Promise.all(
    chunks.map((chunk) => fetchLineItemsForOpportunityIdsWithClient(client, chunk)),
  );

  return chunkResults.flat();
};

const pickRestFields = (
  source: Record<string, unknown>,
  restFieldNames: readonly string[],
): Record<string, unknown> => {
  const patch: Record<string, unknown> = {};
  for (const field of restFieldNames) {
    if (source[field] !== undefined) {
      patch[field] = source[field];
    }
  }
  return patch;
};

export const enrichOpportunityRowsWithRestFields = async (
  client: RestApiClient,
  records: Array<Record<string, unknown>>,
  restFieldNames: readonly string[],
): Promise<Array<Record<string, unknown>>> => {
  if (!records.length || !restFieldNames.length) {
    return records;
  }

  const restDataById = new Map<string, Record<string, unknown>>();

  const chunkResults = await Promise.all(
    chunkIds(
      records.map((record) => String(record.id)),
      REST_ENRICH_CHUNK_SIZE,
    ).map(async (chunk) => {
      const response = await client.get<unknown>('/rest/opportunities', {
        query: {
          limit: chunk.length,
          filter: `id[in]:${JSON.stringify(chunk)}`,
        },
      });
      return normalizeRestListResponse<Record<string, unknown>>(response, 'opportunities');
    }),
  );

  for (const items of chunkResults) {
    for (const item of items) {
      if (typeof item.id === 'string') {
        restDataById.set(item.id, item);
      }
    }
  }

  return records.map((record) => {
    const id = typeof record.id === 'string' ? record.id : '';
    const restRecord = id ? restDataById.get(id) : undefined;
    if (!restRecord) return record;

    const patch = pickRestFields(restRecord, restFieldNames);
    return Object.keys(patch).length ? { ...record, ...patch } : record;
  });
};
