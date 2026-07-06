import { RestApiClient } from 'twenty-client-sdk/rest';

import type { OpportunityRow } from '../types';
import { normalizeRestListResponse } from './rest-list';

let restClient: RestApiClient | null = null;

export const resetOpportunityRestClientForTests = (): void => {
  restClient = null;
};

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
  records: OpportunityRow[],
  restFieldNames: readonly string[],
): Promise<OpportunityRow[]> => {
  if (!records.length || !restFieldNames.length) {
    return records;
  }

  const client = getRestClient();
  const restDataById = new Map<string, Record<string, unknown>>();

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
        restDataById.set(item.id, item);
      }
    }
  }

  return records.map((record) => {
    const restRecord = restDataById.get(record.id);
    if (!restRecord) return record;

    const patch = pickRestFields(restRecord, restFieldNames);
    return Object.keys(patch).length ? { ...record, ...patch } : record;
  });
};

/** @deprecated Use enrichOpportunityRowsWithRestFields */
export const enrichOpportunityRowsWithLinkFields = enrichOpportunityRowsWithRestFields;
