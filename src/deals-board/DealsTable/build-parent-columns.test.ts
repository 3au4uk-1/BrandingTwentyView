import { describe, expect, it } from 'vitest';

import type { ColumnConfig } from '../types';
import { buildParentColumnDefs } from './build-parent-columns';

const SAMPLE_COLUMNS: ColumnConfig[] = [
  { field: 'name', label: 'Сделка', width: 240, order: 0, visible: true },
  { field: 'loadDate', label: 'Дата загрузки', width: 120, order: 1, visible: true },
  { field: 'stage', label: 'Стадия', order: 2, visible: true },
];

describe('buildParentColumnDefs', () => {
  it('maps visible columns to TanStack defs with meta and sizes', () => {
    const defs = buildParentColumnDefs(SAMPLE_COLUMNS);

    expect(defs).toHaveLength(3);
    expect(defs[0]).toMatchObject({
      id: 'name',
      accessorKey: 'name',
      header: 'Сделка',
      size: 240,
    });
    expect(defs[0]?.meta).toEqual({ column: SAMPLE_COLUMNS[0] });
    expect(defs[2]?.size).toBe(120);
  });

  it('returns empty array for no columns', () => {
    expect(buildParentColumnDefs([])).toEqual([]);
  });
});
