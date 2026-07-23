import type { ColumnDef } from '@tanstack/react-table';

import type { ColumnConfig, OpportunityRow } from '../types';
import { getColumnWidth } from '../utils/columns';

import { PARENT_EXPAND_COLUMN_FIELD } from './parent-table-sort';

export type ParentColumnMeta = {
  column: ColumnConfig;
};

export const PARENT_EXPAND_COLUMN: ColumnConfig = {
  field: PARENT_EXPAND_COLUMN_FIELD,
  label: '',
  width: 34,
  order: -1,
  visible: true,
};

export const withParentExpandColumn = (columns: ColumnConfig[]): ColumnConfig[] => {
  if (columns.some((column) => column.field === PARENT_EXPAND_COLUMN_FIELD)) {
    return columns;
  }

  return [PARENT_EXPAND_COLUMN, ...columns];
};

export function buildParentColumnDefs(
  columns: ColumnConfig[],
): ColumnDef<OpportunityRow, unknown>[] {
  return columns.map((column) => ({
    id: column.field,
    accessorKey: column.field === PARENT_EXPAND_COLUMN_FIELD ? undefined : column.field,
    header: column.label,
    size: getColumnWidth(column),
    enableSorting: column.field !== PARENT_EXPAND_COLUMN_FIELD,
    meta: { column } satisfies ParentColumnMeta,
  }));
}
