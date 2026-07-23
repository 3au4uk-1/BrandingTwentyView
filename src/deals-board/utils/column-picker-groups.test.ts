import { describe, expect, it } from 'vitest';

import type { ColumnConfig, ColumnGroupConfig } from '../types';
import {
  assignColumnGroup,
  createGroup,
  deleteGroup,
  moveColumnWithinGroup,
} from './column-picker-groups';

const columns: ColumnConfig[] = [
  { field: 'name', label: 'Позиция', order: 0, visible: true },
  { field: 'plenka', label: 'Плёнка', order: 1, visible: true, groupId: 'print' },
  { field: 'gotovo', label: 'Готово', order: 2, visible: true, groupId: 'print' },
];

describe('assignColumnGroup', () => {
  it('sets groupId or clears it for Без группы', () => {
    const assigned = assignColumnGroup(columns, 'name', 'print');
    expect(assigned.find((column) => column.field === 'name')?.groupId).toBe('print');

    const ungrouped = assignColumnGroup(assigned, 'name', undefined);
    expect(ungrouped.find((column) => column.field === 'name')?.groupId).toBeUndefined();
  });
});

describe('deleteGroup', () => {
  it('removes the group, normalizes group order, and clears member groupIds', () => {
    const groups: ColumnGroupConfig[] = [
      { id: 'other', name: 'Другое', order: 0 },
      { id: 'print', name: 'Печать', order: 1 },
    ];

    expect(deleteGroup(columns, groups, 'print')).toEqual({
      columns: [
        columns[0],
        { ...columns[1], groupId: undefined },
        { ...columns[2], groupId: undefined },
      ],
      groups: [{ id: 'other', name: 'Другое', order: 0 }],
    });
  });
});

describe('createGroup', () => {
  it('appends a group with a UUID v4 and generated Печать N name', () => {
    const groups = createGroup([{ id: 'existing', name: 'Печать', order: 0 }]);

    expect(groups).toHaveLength(2);
    expect(groups[1]).toMatchObject({ name: 'Печать 2', order: 1 });
    expect(groups[1].id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('uses a custom name when provided', () => {
    const groups = createGroup([], 'Монтаж');

    expect(groups[0]).toMatchObject({ name: 'Монтаж', order: 0 });
  });
});

describe('moveColumnWithinGroup', () => {
  it('reorders columns only among members of the same group', () => {
    const moved = moveColumnWithinGroup(columns, 'gotovo', -1);

    expect(moved.find((column) => column.field === 'gotovo')?.order).toBe(1);
    expect(moved.find((column) => column.field === 'plenka')?.order).toBe(2);
    expect(moved.find((column) => column.field === 'name')?.order).toBe(0);
  });

  it('does nothing at a section boundary', () => {
    expect(moveColumnWithinGroup(columns, 'plenka', -1)).toBe(columns);
  });
});
