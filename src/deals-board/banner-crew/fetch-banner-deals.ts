import { RestApiClient } from 'twenty-client-sdk/rest';

import { extractRestPageInfo, normalizeRestListResponse } from '../api/rest-list';
import type { BannerLineRecord, BannerOpportunityRecord } from './banner-deals';

const PAGE_LIMIT = 200;
const OPPORTUNITY_CHUNK = 50;

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
    address: readString(record.address),
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
    all.push(
      ...normalizeRestListResponse<unknown>(response, listKey)
        .map(normalize)
        .filter((item): item is T => item !== null),
    );
    const pageInfo = extractRestPageInfo(response);
    after = pageInfo.hasNextPage && pageInfo.endCursor ? String(pageInfo.endCursor) : undefined;
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

export const fetchBannerLineRecords = (): Promise<BannerLineRecord[]> =>
  fetchPages('/rest/dealLineItems', 'dealLineItems', {
    filter: `tip[in]:${JSON.stringify(['BANNERA'])}`,
  }, normalizeBannerLine);

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
