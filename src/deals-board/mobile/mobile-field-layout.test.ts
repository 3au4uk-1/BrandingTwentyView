import { describe, expect, it } from 'vitest';

import type { ColumnConfig } from '../types';
import {
  clearHeaderFieldGroupIds,
  formatCompactDealDate,
  MOBILE_LINE_ITEM_HEADER_FIELDS,
  partitionColumns,
} from './mobile-field-layout';

const columns: ColumnConfig[] = [
  { field: 'name', label: 'Название', visible: true, order: 0 },
  { field: 'loadDate', label: 'Дата', visible: true, order: 1 },
  { field: 'stage', label: 'Стадия', visible: true, order: 2 },
  { field: 'summary', label: 'Сводка', visible: true, order: 3 },
  { field: 'companyName', label: 'Компания', visible: true, order: 4 },
  { field: 'hidden', label: 'Скрыто', visible: false, order: 5 },
];

describe('partitionColumns', () => {
  it('splits visible columns into header, meta, and detail groups', () => {
    const result = partitionColumns(columns, ['name'], ['loadDate', 'stage', 'summary']);

    expect(result.header.map((column) => column.field)).toEqual(['name']);
    expect(result.meta.map((column) => column.field)).toEqual(['loadDate', 'stage', 'summary']);
    expect(result.detail.map((column) => column.field)).toEqual(['companyName']);
  });
});

describe('clearHeaderFieldGroupIds', () => {
  it('strips groupId from mobile header fields for group layout', () => {
    const columns: ColumnConfig[] = [
      { field: 'name', label: 'Название', visible: true, order: 0, groupId: 'print' },
      { field: 'stage', label: 'Стадия', visible: true, order: 1, groupId: 'print' },
      { field: 'gotovo', label: 'Готово', visible: true, order: 2, groupId: 'print' },
    ];

    const result = clearHeaderFieldGroupIds(columns, MOBILE_LINE_ITEM_HEADER_FIELDS);

    expect(result.find((column) => column.field === 'name')?.groupId).toBeUndefined();
    expect(result.find((column) => column.field === 'stage')?.groupId).toBeUndefined();
    expect(result.find((column) => column.field === 'gotovo')?.groupId).toBe('print');
  });
});

describe('formatCompactDealDate', () => {
  it('formats date without year', () => {
    expect(formatCompactDealDate('2026-07-14T00:00:00.000Z')).toBe('14.07');
  });

  it('returns null for empty values', () => {
    expect(formatCompactDealDate(null)).toBeNull();
    expect(formatCompactDealDate('')).toBeNull();
  });
});
