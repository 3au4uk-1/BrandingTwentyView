import { RestApiClient } from 'twenty-client-sdk/rest';

import { extractRestPageInfo, normalizeRestListResponse } from '../api/rest-list';
import { toInputDate } from '../utils/date-filters';
import type { OkleykaSalaryEntry } from './fund';

const ENDPOINT = '/rest/okleykaSalaryEntries';
const LIST_KEY = 'okleykaSalaryEntries';
const PAGE_LIMIT = 200;

const toDateString = (value: unknown): string =>
  typeof value === 'string' ? value.slice(0, 10) : '';

const normalizeEntry = (raw: unknown): OkleykaSalaryEntry | null => {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.id !== 'string') return null;
  return {
    id: record.id,
    name: typeof record.name === 'string' ? record.name : '',
    hours: typeof record.hours === 'number' && Number.isFinite(record.hours) ? record.hours : 0,
    rateRub:
      typeof record.rateRub === 'number' && Number.isFinite(record.rateRub) ? record.rateRub : 0,
    periodStart: toDateString(record.periodStart),
    periodEnd: toDateString(record.periodEnd),
  };
};

const fetchList = async (filter: string, maxRecords: number): Promise<OkleykaSalaryEntry[]> => {
  const client = new RestApiClient();
  const all: OkleykaSalaryEntry[] = [];
  let after: string | undefined;
  do {
    const response = await client.get<unknown>(ENDPOINT, {
      query: { filter, limit: PAGE_LIMIT, ...(after ? { after } : {}) },
    });
    const page = normalizeRestListResponse<unknown>(response, LIST_KEY)
      .map(normalizeEntry)
      .filter((entry): entry is OkleykaSalaryEntry => entry !== null);
    all.push(...page);
    if (all.length >= maxRecords) break;
    const pageInfo = extractRestPageInfo(response);
    after = pageInfo.hasNextPage && pageInfo.endCursor ? String(pageInfo.endCursor) : undefined;
  } while (after);
  return all;
};

/**
 * All entries whose period starts inside the month. Fetching by month (not by
 * exact period dates) keeps people visible when the split day changes.
 */
export const fetchSalaryEntriesForMonth = (year: number, monthIndex: number) => {
  const from = toInputDate(new Date(year, monthIndex, 1));
  const to = toInputDate(new Date(year, monthIndex + 1, 0));
  return fetchList(`and(periodStart[gte]:"${from}",periodStart[lte]:"${to}")`, 1000);
};

export const fetchEntriesEndedBefore = (dateFrom: string, limit = 400) =>
  fetchList(`periodEnd[lt]:"${dateFrom}"`, limit);

export const createSalaryEntry = async (input: {
  name: string;
  hours: number;
  rateRub: number;
  periodStart: string;
  periodEnd: string;
}): Promise<void> => {
  const client = new RestApiClient();
  await client.post<unknown>(ENDPOINT, input);
};

export const updateSalaryEntry = async (
  id: string,
  patch: Partial<{
    name: string;
    hours: number;
    rateRub: number;
    periodStart: string;
    periodEnd: string;
  }>,
): Promise<void> => {
  const client = new RestApiClient();
  await client.patch<unknown>(`${ENDPOINT}/${id}`, patch);
};

export const deleteSalaryEntry = async (id: string): Promise<void> => {
  const client = new RestApiClient();
  await client.delete<unknown>(`${ENDPOINT}/${id}`);
};
