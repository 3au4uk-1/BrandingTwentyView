import { RestApiClient } from 'twenty-client-sdk/rest';

import type { LineItemRow } from '../types';
import { extractRestPageInfo, normalizeRestListResponse } from './rest-list';

let restClient: RestApiClient | null = null;

const PAGE_LIMIT = 200;
const OPPORTUNITY_ID_CHUNK_SIZE = 25;

const getRestClient = (): RestApiClient => {
  if (!restClient) restClient = new RestApiClient();
  return restClient;
};

export const buildDealLineItemsFilter = (
  opportunityIds: string[],
  stageFilter?: string[],
): string => {
  const opportunityFilter = `opportunityId[in]:${JSON.stringify(opportunityIds)}`;
  if (!stageFilter?.length) return opportunityFilter;
  return `and(${opportunityFilter},stage[in]:${JSON.stringify(stageFilter)})`;
};

export const buildDealLineItemsQuery = (
  opportunityIds: string[],
  stageFilter?: string[],
  after?: string,
): Record<string, string | number> => {
  const query: Record<string, string | number> = {
    limit: PAGE_LIMIT,
    filter: buildDealLineItemsFilter(opportunityIds, stageFilter),
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
  stageFilter?: string[],
  after?: string,
): Promise<{ items: LineItemRow[]; nextCursor?: string }> => {
  const response = await client.get<unknown>('/rest/dealLineItems', {
    query: buildDealLineItemsQuery(opportunityIds, stageFilter, after),
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
  stageFilter?: string[],
): Promise<LineItemRow[]> => {
  const allItems: LineItemRow[] = [];
  let after: string | undefined;

  do {
    const page = await fetchLineItemsPage(client, opportunityIds, stageFilter, after);
    allItems.push(...page.items);
    after = page.nextCursor;
  } while (after);

  return allItems;
};

export const fetchLineItemsByOpportunityIds = async (
  opportunityIds: string[],
  stageFilter?: string[],
): Promise<LineItemRow[]> => {
  if (opportunityIds.length === 0) return [];

  const client = getRestClient();
  const chunks = chunkOpportunityIds(opportunityIds, OPPORTUNITY_ID_CHUNK_SIZE);
  const chunkResults = await Promise.all(
    chunks.map((chunk) => fetchLineItemsForOpportunityChunk(client, chunk, stageFilter)),
  );

  return chunkResults.flat();
};

export const updateLineItem = async (
  id: string,
  data: Partial<Pick<LineItemRow, 'stage' | 'kolichestvo' | 'kommentariy'>> & {
    ssylkaNaMakety?: { primaryLinkUrl: string; primaryLinkLabel?: string };
    plenka?: { markdown: string };
  },
): Promise<void> => {
  const client = getRestClient();
  await client.patch(`/rest/dealLineItems/${id}`, data);
};
