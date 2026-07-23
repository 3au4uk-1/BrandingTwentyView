import type { ColumnConfig, ColumnGroupConfig } from '../types';
import { parseJsonField } from './parse-json-field';

type ChildColumnsV2Payload = {
  version: 2;
  columns: ColumnConfig[];
  groups: ColumnGroupConfig[];
};

const isColumnGroupConfig = (value: unknown): value is ColumnGroupConfig =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as ColumnGroupConfig).id === 'string' &&
  typeof (value as ColumnGroupConfig).name === 'string' &&
  typeof (value as ColumnGroupConfig).order === 'number';

const isChildColumnsV2Payload = (value: unknown): value is ChildColumnsV2Payload =>
  typeof value === 'object' &&
  value !== null &&
  (value as ChildColumnsV2Payload).version === 2 &&
  Array.isArray((value as ChildColumnsV2Payload).columns) &&
  Array.isArray((value as ChildColumnsV2Payload).groups);

const parseColumnList = (raw: unknown): ColumnConfig[] =>
  (Array.isArray(raw) ? raw : [])
    .filter((c): c is ColumnConfig => typeof c?.field === 'string')
    .sort((a, b) => a.order - b.order);

const parseGroupList = (raw: unknown): ColumnGroupConfig[] =>
  (Array.isArray(raw) ? raw : [])
    .filter(isColumnGroupConfig)
    .sort((a, b) => a.order - b.order);

export const parseChildColumnsPayload = (
  raw: unknown,
  fallbackColumns: ColumnConfig[],
): { columns: ColumnConfig[]; groups: ColumnGroupConfig[] } => {
  const parsed = parseJsonField(raw);

  if (isChildColumnsV2Payload(parsed)) {
    const groups = parseGroupList(parsed.groups);
    const groupIds = new Set(groups.map((group) => group.id));
    const columns = parseColumnList(parsed.columns).map((column) =>
      column.groupId && groupIds.has(column.groupId)
        ? column
        : { ...column, groupId: undefined },
    );

    return { columns, groups };
  }

  if (Array.isArray(parsed)) {
    return { columns: parseColumnList(parsed), groups: [] };
  }

  return { columns: fallbackColumns, groups: [] };
};

export const serializeChildColumnsPayload = (
  columns: ColumnConfig[],
  groups: ColumnGroupConfig[],
): ChildColumnsV2Payload => ({
  version: 2,
  columns,
  groups,
});

export const parseColumns = (raw: unknown, fallback: ColumnConfig[]): ColumnConfig[] => {
  const parsed = parseJsonField(raw);
  if (!Array.isArray(parsed)) return fallback;

  return parsed
    .filter((c): c is ColumnConfig => typeof c?.field === 'string')
    .sort((a, b) => a.order - b.order);
};

export const visibleColumns = (columns: ColumnConfig[]): ColumnConfig[] =>
  (Array.isArray(columns) ? columns : []).filter((c) => c.visible);

export const DEFAULT_COLUMN_WIDTH = 120;

export const getColumnWidth = (column: ColumnConfig): number =>
  column.width ?? DEFAULT_COLUMN_WIDTH;

export const sumColumnWidths = (columns: ColumnConfig[]): number =>
  columns.reduce((sum, column) => sum + getColumnWidth(column), 0);

/** Stretch the first column so the table fills the container without changing saved widths. */
export const layoutColumnsForContainer = (
  columns: ColumnConfig[],
  containerWidth: number,
  fillField?: string,
): ColumnConfig[] => {
  if (!columns.length || containerWidth <= 0) return columns;

  const sum = sumColumnWidths(columns);
  if (sum >= containerWidth) return columns;

  const targetField = fillField ?? columns[0]?.field;
  const extra = containerWidth - sum;

  return columns.map((column) =>
    column.field === targetField
      ? { ...column, width: getColumnWidth(column) + extra }
      : column,
  );
};

export const getTableLayoutStyle = (
  columns: ColumnConfig[],
  containerWidth: number,
): { width: string; minWidth: string } => {
  const sum = sumColumnWidths(columns);
  const minWidth = Math.max(containerWidth, sum);

  return {
    width: '100%',
    minWidth: `${minWidth}px`,
  };
};
