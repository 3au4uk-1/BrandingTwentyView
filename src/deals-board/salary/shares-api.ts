import { RestApiClient } from 'twenty-client-sdk/rest';

import { extractRestPageInfo, normalizeRestListResponse } from '../api/rest-list';
import type { OkleykaDealShare } from './shares';

const ENDPOINT = '/rest/okleykaDealShares';
const LIST_KEY = 'okleykaDealShares';
const PAGE_LIMIT = 200;
const ID_CHUNK = 50;

const chunkIds = (ids: string[]): string[][] => {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += ID_CHUNK) out.push(ids.slice(i, i + ID_CHUNK));
  return out;
};

export const buildSharesFilter = (opportunityIds: string[]): string =>
  `opportunityId[in]:${JSON.stringify(opportunityIds)}`;

export const normalizeShare = (raw: unknown): OkleykaDealShare | null => {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.id !== 'string') return null;

  const opportunityId =
    typeof record.opportunityId === 'string'
      ? record.opportunityId
      : record.opportunity && typeof record.opportunity === 'object'
        ? String((record.opportunity as { id?: string }).id ?? '')
        : '';

  const salaryEntryId =
    typeof record.salaryEntryId === 'string'
      ? record.salaryEntryId
      : record.salaryEntry && typeof record.salaryEntry === 'object'
        ? String((record.salaryEntry as { id?: string }).id ?? '')
        : '';

  if (!opportunityId || !salaryEntryId) return null;

  return {
    id: record.id,
    opportunityId,
    salaryEntryId,
    amountRub:
      typeof record.amountRub === 'number' && Number.isFinite(record.amountRub)
        ? record.amountRub
        : 0,
  };
};

const fetchList = async (filter: string): Promise<OkleykaDealShare[]> => {
  const client = new RestApiClient();
  const all: OkleykaDealShare[] = [];
  let after: string | undefined;

  do {
    const response = await client.get<unknown>(ENDPOINT, {
      query: { filter, limit: PAGE_LIMIT, ...(after ? { after } : {}) },
    });
    const page = normalizeRestListResponse<unknown>(response, LIST_KEY)
      .map(normalizeShare)
      .filter((share): share is OkleykaDealShare => share !== null);
    all.push(...page);
    const pageInfo = extractRestPageInfo(response);
    after = pageInfo.hasNextPage && pageInfo.endCursor ? String(pageInfo.endCursor) : undefined;
  } while (after);

  return all;
};

export const fetchSharesForOpportunities = async (
  opportunityIds: string[],
): Promise<OkleykaDealShare[]> => {
  if (opportunityIds.length === 0) return [];

  const all: OkleykaDealShare[] = [];
  for (const chunk of chunkIds(opportunityIds)) {
    const shares = await fetchList(buildSharesFilter(chunk));
    all.push(...shares);
  }
  return all;
};

export const upsertShare = async (input: {
  opportunityId: string;
  salaryEntryId: string;
  amountRub: number;
  existingId?: string;
}): Promise<void> => {
  const client = new RestApiClient();
  const payload = {
    opportunityId: input.opportunityId,
    salaryEntryId: input.salaryEntryId,
    amountRub: input.amountRub,
  };

  if (input.existingId) {
    await client.patch<unknown>(`${ENDPOINT}/${input.existingId}`, payload);
    return;
  }

  await client.post<unknown>(ENDPOINT, payload);
};

export const deleteShare = async (id: string): Promise<void> => {
  const client = new RestApiClient();
  await client.delete<unknown>(`${ENDPOINT}/${id}`);
};

export const deleteShares = async (ids: string[]): Promise<void> => {
  if (ids.length === 0) return;
  const results = await Promise.allSettled(ids.map((id) => deleteShare(id)));
  if (results.some((result) => result.status === 'rejected')) {
    throw new Error('Не удалось удалить часть долей оклейки');
  }
};
