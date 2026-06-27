import { RestApiClient } from 'twenty-client-sdk/rest';

import type { OpportunityRow } from '../types';
import { normalizeRestListResponse } from './rest-list';

let restClient: RestApiClient | null = null;

const ID_CHUNK_SIZE = 50;

const getRestClient = (): RestApiClient => {
  if (!restClient) restClient = new RestApiClient();
  return restClient;
};

const chunkIds = (ids: string[], chunkSize: number): string[][] => {
  const chunks: string[][] = [];
  for (let index = 0; index < ids.length; index += chunkSize) {
    chunks.push(ids.slice(index, index + chunkSize));
  }
  return chunks;
};

const pickLinkFields = (
  source: Record<string, unknown>,
  linkFieldNames: readonly string[],
): Record<string, unknown> => {
  const patch: Record<string, unknown> = {};
  for (const field of linkFieldNames) {
    if (source[field] !== undefined) {
      patch[field] = source[field];
    }
  }
  return patch;
};

export const enrichOpportunityRowsWithLinkFields = async (
  records: OpportunityRow[],
  linkFieldNames: readonly string[],
): Promise<OpportunityRow[]> => {
  if (!records.length || !linkFieldNames.length) {
    return records;
  }

  const client = getRestClient();
  const linkDataById = new Map<string, Record<string, unknown>>();

  for (const chunk of chunkIds(
    records.map((record) => record.id),
    ID_CHUNK_SIZE,
  )) {
    const response = await client.get<unknown>('/rest/opportunities', {
      query: {
        limit: chunk.length,
        filter: `id[in]:${JSON.stringify(chunk)}`,
      },
    });

    for (const item of normalizeRestListResponse<Record<string, unknown>>(response, 'opportunities')) {
      if (typeof item.id === 'string') {
        linkDataById.set(item.id, item);
      }
    }
  }

  return records.map((record) => {
    const restRecord = linkDataById.get(record.id);
    if (!restRecord) return record;

    const patch = pickLinkFields(restRecord, linkFieldNames);
    return Object.keys(patch).length ? { ...record, ...patch } : record;
  });
};
