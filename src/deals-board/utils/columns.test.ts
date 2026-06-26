import { describe, expect, it } from 'vitest';
import type { ColumnConfig } from '../types';
import { parseColumns, visibleColumns } from './columns';

const fallback: ColumnConfig[] = [
  { field: 'name', label: 'Name', order: 0, visible: true },
  { field: 'stage', label: 'Stage', order: 1, visible: false },
];

describe('parseColumns', () => {
  it('returns fallback when raw is invalid', () => {
    expect(parseColumns(null, fallback)).toEqual(fallback);
    expect(parseColumns('not-an-array', fallback)).toEqual(fallback);
  });

  it('parses valid columns and sorts by order', () => {
    const raw = [
      { field: 'stage', label: 'Stage', order: 1, visible: true },
      { field: 'name', label: 'Name', order: 0, visible: true },
    ];
    expect(parseColumns(raw, fallback)).toEqual([
      { field: 'name', label: 'Name', order: 0, visible: true },
      { field: 'stage', label: 'Stage', order: 1, visible: true },
    ]);
  });

  it('filters out entries without a field string', () => {
    const raw = [
      { field: 'name', label: 'Name', order: 0, visible: true },
      { label: 'Missing field', order: 1, visible: true },
      { field: 123, label: 'Bad field', order: 2, visible: true },
    ];
    expect(parseColumns(raw, fallback)).toEqual([
      { field: 'name', label: 'Name', order: 0, visible: true },
    ]);
  });
});

describe('visibleColumns', () => {
  it('filters to visible columns only', () => {
    const columns: ColumnConfig[] = [
      { field: 'name', label: 'Name', order: 0, visible: true },
      { field: 'stage', label: 'Stage', order: 1, visible: false },
      { field: 'amount', label: 'Amount', order: 2, visible: true },
    ];
    expect(visibleColumns(columns)).toEqual([
      { field: 'name', label: 'Name', order: 0, visible: true },
      { field: 'amount', label: 'Amount', order: 2, visible: true },
    ]);
  });
});
