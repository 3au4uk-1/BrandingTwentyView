import type { ColumnConfig } from '../types';

export const parseColumns = (raw: unknown, fallback: ColumnConfig[]): ColumnConfig[] => {
  if (!Array.isArray(raw)) return fallback;
  return raw
    .filter((c): c is ColumnConfig => typeof c?.field === 'string')
    .sort((a, b) => a.order - b.order);
};

export const visibleColumns = (columns: ColumnConfig[]): ColumnConfig[] =>
  columns.filter((c) => c.visible);
