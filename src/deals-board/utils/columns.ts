import type { ColumnConfig } from '../types';
import { parseJsonField } from './parse-json-field';

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
