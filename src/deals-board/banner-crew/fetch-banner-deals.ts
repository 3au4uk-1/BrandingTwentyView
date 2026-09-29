import { RestApiClient } from 'twenty-client-sdk/rest';

import { extractRestPageInfo, normalizeRestListResponse, resolveNextRestCursor } from '../api/rest-list';
import type { BannerLineRecord, BannerOpportunityRecord } from './banner-deals';

const PAGE_LIMIT = 200;
const OPPORTUNITY_CHUNK = 50;
const BANNER_TIP_FILTER = 'tip[in]:["BANNERA"]';

const bannerLineFilter = (afterId?: string): string =>
  afterId ? `and(${BANNER_TIP_FILTER},id[gt]:"${afterId}")` : BANNER_TIP_FILTER;

const readId = (raw: unknown): string | null =>
  raw && typeof raw === 'object' && typeof (raw as { id?: unknown }).id === 'string'
    ? (raw as { id: string }).id
    : null;

const readString = (value: unknown): string | null =>
  typeof value === 'string' ? value : null;

export const normalizeBannerOpportunity = (raw: unknown): BannerOpportunityRecord | null => {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.id !== 'string') return null;
  return {
    id: record.id,
    name: readString(record.name) ?? '',
    stage: readString(record.stage),
    address: readString(record.clientAddress),
    loadDate: readString(record.loadDate),
  };
};

export const normalizeBannerLine = (raw: unknown): BannerLineRecord | null => {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const opportunityId = readString(record.opportunityId);
  if (!opportunityId || typeof record.name !== 'string') return null;
  return { opportunityId, name: record.name, tip: readString(record.tip) };
};

const fetchPages = async <T>(
  path: string,
  listKey: string,
  query: Record<string, string | number>,
  normalize: (raw: unknown) => T | null,
): Promise<T[]> => {
  const client = new RestApiClient();
  const all: T[] = [];
  let after: string | undefined;
  do {
    const response = await client.get<unknown>(path, {
      query: { limit: PAGE_LIMIT, ...query, ...(after ? { after } : {}) },
    });
    const pageInfo = extractRestPageInfo(response);
    const next = resolveNextRestCursor(after, pageInfo);
    const stuck = after !== undefined
      && next === undefined
      && pageInfo.hasNextPage === true
      && String(pageInfo.endCursor ?? '') === after;
    if (!stuck) {
      all.push(
        ...normalizeRestListResponse<unknown>(response, listKey)
          .map(normalize)
          .filter((item): item is T => item !== null),
      );
    }
    after = next;
  } while (after);
  return all;
};

const chunk = <T,>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

export const fetchBannerLineRecords = async (): Promise<BannerLineRecord[]> => {
  const client = new RestApiClient();
  const all: BannerLineRecord[] = [];
  let afterId: string | undefined;

  for (;;) {
    const response = await client.get<unknown>('/rest/dealLineItems', {
      query: { limit: PAGE_LIMIT, filter: bannerLineFilter(afterId) },
    });
    const raw = normalizeRestListResponse<unknown>(response, 'dealLineItems');
    const lastId = raw.map(readId).filter((id): id is string => id !== null).at(-1);
    if (!lastId || (afterId !== undefined && lastId <= afterId)) break;
    all.push(
      ...raw
        .map(normalizeBannerLine)
        .filter((item): item is BannerLineRecord => item !== null),
    );
    if (raw.length < PAGE_LIMIT) break;
    afterId = lastId;
  }

  return all;
};

export const fetchBannerOpportunities = async (
  ids: string[],
): Promise<BannerOpportunityRecord[]> => {
  const unique = [...new Set(ids)];
  const pages = await Promise.all(
    chunk(unique, OPPORTUNITY_CHUNK).map((idsChunk) =>
      fetchPages(
        '/rest/opportunities',
        'opportunities',
        { filter: `id[in]:${JSON.stringify(idsChunk)}`, limit: idsChunk.length },
        normalizeBannerOpportunity,
      ),
    ),
  );
  return pages.flat();
};
