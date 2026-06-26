import {
  DEFAULT_CHILD_COLUMNS,
  DEFAULT_PARENT_COLUMNS,
} from 'src/constants/column-definitions';

import { parseColumns } from '../utils/columns';
import { parseJsonField } from '../utils/parse-json-field';
import { normalizeStageList } from '../utils/filters';
import type { DealBoardFilters, DealBoardSort, DealBoardViewRecord } from '../types';
import { getApiClient } from './client';

const VIEW_FIELDS = {
  id: true,
  name: true,
  visibility: true,
  parentColumns: true,
  childColumns: true,
  filters: true,
  sort: true,
  isDefault: true,
} as const;

type RawViewNode = {
  id: string;
  name: string;
  visibility: string;
  parentColumns: unknown;
  childColumns: unknown;
  filters: unknown;
  sort: unknown;
  isDefault?: boolean | null;
};

const parseFilters = (raw: unknown): DealBoardFilters => {
  const parsed = parseJsonField(raw);
  if (!parsed || typeof parsed !== 'object') return {};

  const filters = parsed as DealBoardFilters;
  const stages = normalizeStageList((filters as { stages?: unknown }).stages);

  return {
    ...filters,
    stages: stages.length ? stages : undefined,
  };
};

const parseSort = (raw: unknown): DealBoardSort[] => {
  const parsed = parseJsonField(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (s): s is DealBoardSort =>
      typeof s === 'object' &&
      s !== null &&
      typeof (s as DealBoardSort).field === 'string' &&
      ((s as DealBoardSort).direction === 'AscNullsFirst' ||
        (s as DealBoardSort).direction === 'DescNullsLast'),
  );
};

const mapViewRecord = (node: RawViewNode): DealBoardViewRecord => ({
  id: node.id,
  name: node.name,
  visibility: node.visibility as DealBoardViewRecord['visibility'],
  parentColumns: parseColumns(node.parentColumns, DEFAULT_PARENT_COLUMNS),
  childColumns: parseColumns(node.childColumns, DEFAULT_CHILD_COLUMNS),
  filters: parseFilters(node.filters),
  sort: parseSort(node.sort),
  isDefault: node.isDefault ?? false,
});

export const fetchDealBoardViews = async (): Promise<DealBoardViewRecord[]> => {
  const client = getApiClient();
  const result = await client.query({
    dealBoardViews: {
      __args: { first: 100 },
      edges: { node: VIEW_FIELDS },
    },
  });

  return (result.dealBoardViews?.edges ?? []).map((e) => mapViewRecord(e.node as RawViewNode));
};

export const createDealBoardView = async (
  data: Omit<DealBoardViewRecord, 'id'>,
): Promise<DealBoardViewRecord> => {
  const client = getApiClient();
  const result = await client.mutation({
    createDealBoardView: {
      __args: {
        data: {
          name: data.name,
          visibility: data.visibility,
          parentColumns: data.parentColumns,
          childColumns: data.childColumns,
          filters: data.filters,
          sort: data.sort,
          isDefault: data.isDefault,
        },
      },
      ...VIEW_FIELDS,
    },
  });

  return mapViewRecord(result.createDealBoardView as RawViewNode);
};

export const updateDealBoardView = async (
  id: string,
  data: Partial<Omit<DealBoardViewRecord, 'id'>>,
): Promise<DealBoardViewRecord> => {
  const client = getApiClient();
  const result = await client.mutation({
    updateDealBoardView: {
      __args: { id, data },
      ...VIEW_FIELDS,
    },
  });

  return mapViewRecord(result.updateDealBoardView as RawViewNode);
};
