import { describe, expect, it } from 'vitest';
import { DEFAULT_CHILD_COLUMNS } from 'src/constants/column-definitions';
import {
  PRINT_FIELD_GROUP_ID,
  PRINT_FIELD_GROUP_MEMBER_FIELDS,
} from 'src/constants/print-field-group';
import type { ColumnConfig, ColumnGroupConfig } from '../types';
import {
  applyPrintGroupSeed,
  buildChildLayoutColumns,
  formatGroupChipLabel,
  getGroupChipStatus,
} from './column-groups';

const printGroup: ColumnGroupConfig = {
  id: PRINT_FIELD_GROUP_ID,
  name: 'Печать',
  order: 0,
};

describe('applyPrintGroupSeed', () => {
  it('is idempotent when groups already exist', () => {
    const columns: ColumnConfig[] = [
      { field: 'plenka', label: 'Плёнка', order: 0, visible: true, groupId: 'existing' },
    ];
    const groups: ColumnGroupConfig[] = [{ id: 'existing', name: 'Custom', order: 0 }];

    const result = applyPrintGroupSeed(columns, groups);

    expect(result).toEqual({ columns, groups });
  });

  it('assigns print fields to Печать and leaves zatratyNaRabotu ungrouped', () => {
    const columns: ColumnConfig[] = [
      { field: 'name', label: 'Позиция', order: 0, visible: true },
      { field: 'ssylkaNaMakety', label: 'Макеты', order: 1, visible: true },
      { field: 'plenka', label: 'Плёнка', order: 2, visible: true },
      { field: 'gotovo', label: 'Готово', order: 3, visible: true },
      { field: 'zatratyNaRabotu', label: 'Затраты на работу', order: 4, visible: true },
    ];

    const result = applyPrintGroupSeed(columns, []);

    expect(result.groups).toEqual([printGroup]);
    expect(result.columns.find((c) => c.field === 'ssylkaNaMakety')?.groupId).toBe(
      PRINT_FIELD_GROUP_ID,
    );
    expect(result.columns.find((c) => c.field === 'plenka')?.groupId).toBe(
      PRINT_FIELD_GROUP_ID,
    );
    expect(result.columns.find((c) => c.field === 'gotovo')?.groupId).toBe(
      PRINT_FIELD_GROUP_ID,
    );
    expect(result.columns.find((c) => c.field === 'zatratyNaRabotu')?.groupId).toBeUndefined();
    expect(result.columns.find((c) => c.field === 'name')?.groupId).toBeUndefined();

    for (const field of PRINT_FIELD_GROUP_MEMBER_FIELDS) {
      const column = result.columns.find((c) => c.field === field);
      if (column) {
        expect(column.groupId).toBe(PRINT_FIELD_GROUP_ID);
      }
    }
  });
});

describe('buildChildLayoutColumns', () => {
  it('omits groups with no visible members', () => {
    const columns: ColumnConfig[] = [
      { field: 'name', label: 'Позиция', order: 0, visible: true },
      { field: 'plenka', label: 'Плёнка', order: 1, visible: false, groupId: printGroup.id },
      { field: 'gotovo', label: 'Готово', order: 2, visible: false, groupId: printGroup.id },
    ];

    const layout = buildChildLayoutColumns(columns, [printGroup]);

    expect(layout).toEqual([columns[0]]);
  });

  it('keeps ungrouped visible fields as normal columns', () => {
    const columns: ColumnConfig[] = [
      { field: 'name', label: 'Позиция', order: 0, visible: true },
      { field: 'tip', label: 'Тип', order: 1, visible: true },
      { field: 'zatratyNaRabotu', label: 'Затраты на работу', order: 2, visible: true },
      { field: 'plenka', label: 'Плёнка', order: 3, visible: true, groupId: printGroup.id },
      { field: 'gotovo', label: 'Готово', order: 4, visible: true, groupId: printGroup.id },
    ];

    const layout = buildChildLayoutColumns(columns, [printGroup]);

    expect(layout[0]).toEqual(columns[0]);
    expect(layout[1]).toEqual(columns[1]);
    expect(layout[2]).toEqual(columns[2]);
    expect(layout[3]).toEqual({
      type: 'group',
      group: printGroup,
      members: [columns[3], columns[4]],
    });
    expect(layout).toHaveLength(4);
  });
});

describe('getGroupChipStatus', () => {
  const members: ColumnConfig[] = [
    { field: 'vzatoVRabotu', label: 'Взято', order: 0, visible: true },
    { field: 'gotovo', label: 'Готово', order: 1, visible: true },
  ];

  it('prefers gotovo over vzatoVRabotu', () => {
    expect(
      getGroupChipStatus(members, { id: '1', vzatoVRabotu: true, gotovo: true }),
    ).toBe('gotovo');
    expect(getGroupChipStatus(members, { id: '1', vzatoVRabotu: true })).toBe('vzyato');
  });

  it('returns null when neither flag is set', () => {
    expect(getGroupChipStatus(members, { id: '1' })).toBeNull();
    expect(
      getGroupChipStatus(members, { id: '1', vzatoVRabotu: false, gotovo: false }),
    ).toBeNull();
  });
});

describe('formatGroupChipLabel', () => {
  it('name mode ignores status', () => {
    expect(formatGroupChipLabel('Печать', 'gotovo', 'name')).toBe('Печать');
  });

  it('name+status appends suffix', () => {
    expect(formatGroupChipLabel('Печать', 'gotovo', 'name+status')).toBe('Печать · готово');
    expect(formatGroupChipLabel('Печать', 'vzyato', 'name+status')).toBe('Печать · взято');
  });
});

describe('DEFAULT_CHILD_COLUMNS', () => {
  it('seeds print members and labor column from defaults', () => {
    expect(DEFAULT_CHILD_COLUMNS.find((c) => c.field === 'zatratyNaRabotu')).toMatchObject({
      visible: true,
      width: 140,
    });
    expect(DEFAULT_CHILD_COLUMNS.find((c) => c.field === 'ssylkaNaMakety')?.groupId).toBe(
      PRINT_FIELD_GROUP_ID,
    );
    expect(DEFAULT_CHILD_COLUMNS.find((c) => c.field === 'plenka')?.groupId).toBe(
      PRINT_FIELD_GROUP_ID,
    );
  });
});
