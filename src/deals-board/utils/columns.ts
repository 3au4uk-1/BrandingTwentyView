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

export const sumColumnWidths = (columns: ColumnConfig[]): number =>
  columns.reduce((sum, column) => sum + (column.width ?? DEFAULT_COLUMN_WIDTH), 0);
