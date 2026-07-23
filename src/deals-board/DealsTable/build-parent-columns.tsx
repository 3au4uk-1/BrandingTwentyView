import type { ColumnDef } from '@tanstack/react-table';

import type { ColumnConfig, OpportunityRow } from '../types';
import { getColumnWidth } from '../utils/columns';

export type ParentColumnMeta = {
  column: ColumnConfig;
};

export function buildParentColumnDefs(
  columns: ColumnConfig[],
): ColumnDef<OpportunityRow, unknown>[] {
  return columns.map((column) => ({
    id: column.field,
    accessorKey: column.field,
    header: column.label,
    size: getColumnWidth(column),
    meta: { column } satisfies ParentColumnMeta,
  }));
}
