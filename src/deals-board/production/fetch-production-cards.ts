import { RestApiClient } from 'twenty-client-sdk/rest';

import { parsePrevyuFileRefsForDisplay } from 'src/logic-functions/shared/prevyu-upload-service';

import { normalizeRestListResponse } from '../api/rest-list';
import type { LineItemFileRef } from '../types';
import type { ProductionCard } from './board';

const PAGE_LIMIT = 200;
const OPPORTUNITY_CHUNK = 50;
const FLAG_FILTER = 'vProizvodstvo[eq]:true';

const lineFilter = (afterId?: string): string =>
  afterId ? `and(${FLAG_FILTER},id[gt]:"${afterId}")` : FLAG_FILTER;

const readId = (raw: unknown): string | null =>
  raw && typeof raw === 'object' && typeof (raw as { id?: unknown }).id === 'string'
    ? (raw as { id: string }).id
    : null;

const readString = (value: unknown): string | null =>
  typeof value === 'string' ? value : null;

export type ProductionLineRecord = {
  id: string;
  name: string;
  opportunityId: string | null;
  date: string | null;
  time: string | null;
  comment: string;
  vzato: boolean;
  gotovo: boolean;
  files: LineItemFileRef[];
};

export type ProductionOpportunityRecord = { id: string; name: string };

export const normalizeProductionLine = (raw: unknown): ProductionLineRecord | null => {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.id !== 'string' || typeof record.name !== 'string') return null;
  return {
    id: record.id,
    name: record.name,
    opportunityId: readString(record.opportunityId),
    date: readString(record.dataGotovnostiProizvodstva),
    time: readString(record.vremyaGotovnostiProizvodstva),
    comment: readString(record.kommentariyDlyaProizvodstva) ?? '',
    vzato: record.vzatoVRabotuProizvodstva === true,
    gotovo: record.gotovoProizvodstva === true,
    files: parsePrevyuFileRefsForDisplay(record.fotoProizvodstva),
  };
};

export const normalizeProductionOpportunity = (
  raw: unknown,
): ProductionOpportunityRecord | null => {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.id !== 'string') return null;
  return { id: record.id, name: readString(record.name) ?? '' };
};

export const assembleProductionCards = (
  lines: ProductionLineRecord[],
  opportunities: ProductionOpportunityRecord[],
): ProductionCard[] => {
  const names = new Map(opportunities.map((deal) => [deal.id, deal.name]));
  return lines.map((line) => ({
    id: line.id,
    name: line.name,
    dealName: line.opportunityId ? names.get(line.opportunityId) ?? '' : '',
    date: line.date,
    time: line.time,
    comment: line.comment,
    vzato: line.vzato,
    gotovo: line.gotovo,
    files: line.files,
  }));
};

const chunk = <T,>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

export const fetchProductionLineRecords = async (): Promise<ProductionLineRecord[]> => {
  const client = new RestApiClient();
  const all: ProductionLineRecord[] = [];
  let afterId: string | undefined;

  for (;;) {
    const response = await client.get<unknown>('/rest/dealLineItems', {
      query: { limit: PAGE_LIMIT, filter: lineFilter(afterId) },
    });
    const raw = normalizeRestListResponse<unknown>(response, 'dealLineItems');
    const lastId = raw.map(readId).filter((id): id is string => id !== null).at(-1);
    if (!lastId || (afterId !== undefined && lastId <= afterId)) break;
    all.push(
      ...raw
        .map(normalizeProductionLine)
        .filter((item): item is ProductionLineRecord => item !== null),
    );
    if (raw.length < PAGE_LIMIT) break;
    afterId = lastId;
  }

  return all;
};

export const fetchProductionOpportunities = async (
  ids: string[],
): Promise<ProductionOpportunityRecord[]> => {
  const unique = [...new Set(ids)];
  const client = new RestApiClient();
  const pages = await Promise.all(
    chunk(unique, OPPORTUNITY_CHUNK).map(async (idsChunk) => {
      const response = await client.get<unknown>('/rest/opportunities', {
        query: {
          limit: idsChunk.length,
          filter: `id[in]:${JSON.stringify(idsChunk)}`,
        },
      });
      return normalizeRestListResponse<unknown>(response, 'opportunities')
        .map(normalizeProductionOpportunity)
        .filter((item): item is ProductionOpportunityRecord => item !== null);
    }),
  );
  return pages.flat();
};
