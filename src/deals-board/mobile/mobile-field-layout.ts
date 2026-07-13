import { toLocalInputDate } from '../utils/date-filters';
import type { ColumnConfig } from '../types';

export const MOBILE_DEAL_META_FIELDS = ['loadDate', 'stage', 'summary'] as const;

export const MOBILE_LINE_ITEM_HEADER_FIELDS = ['name', 'stage'] as const;

export type PartitionedColumns = {
  header: ColumnConfig[];
  meta: ColumnConfig[];
  detail: ColumnConfig[];
};

export const partitionColumns = (
  columns: ColumnConfig[],
  headerFields: readonly string[],
  metaFields: readonly string[] = [],
): PartitionedColumns => {
  const visible = columns.filter((column) => column.visible);
  const headerSet = new Set(headerFields);
  const metaSet = new Set(metaFields);

  return {
    header: visible.filter((column) => headerSet.has(column.field)),
    meta: visible.filter((column) => metaSet.has(column.field)),
    detail: visible.filter(
      (column) => !headerSet.has(column.field) && !metaSet.has(column.field),
    ),
  };
};

export const formatCompactDealDate = (value: unknown): string | null => {
  if (typeof value !== 'string' || !value) return null;

  const inputDate = toLocalInputDate(value);
  if (!inputDate) return null;

  const [, month, day] = inputDate.split('-');
  return `${day}.${month}`;
};
