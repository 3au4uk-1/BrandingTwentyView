import { describe, expect, it } from 'vitest';
import { DEFAULT_PARENT_COLUMNS } from 'src/constants/column-definitions';
import type { ColumnConfig } from '../types';
import { mergeColumns } from './merge-columns';
import type { FieldDescriptor } from './types';
import { VIRTUAL_PARENT_FIELD_DESCRIPTORS } from './virtual-columns';

const crmFields: FieldDescriptor[] = [
  { field: 'name', label: 'Сделка', source: 'crm', fieldType: 'TEXT', isEditable: true },
  { field: 'loadDate', label: 'Дата загрузки', source: 'crm', fieldType: 'DATE', isEditable: true },
  { field: 'newField', label: 'Новое поле', source: 'crm', fieldType: 'TEXT', isEditable: true },
];

const saved: ColumnConfig[] = [
  { field: 'name', label: 'Old label', order: 0, visible: true, width: 320 },
  { field: 'loadDate', label: 'Old date', order: 1, visible: true, width: 100 },
  { field: 'removedField', label: 'Gone', order: 2, visible: true, width: 100 },
];

describe('mergeColumns', () => {
  it('updates labels from descriptors and keeps saved order/width/visible', () => {
    const merged = mergeColumns(saved, crmFields, VIRTUAL_PARENT_FIELD_DESCRIPTORS);
    expect(merged.find((c) => c.field === 'name')).toMatchObject({
      label: 'Сделка',
      order: 0,
      visible: true,
      width: 320,
    });
  });

  it('appends new CRM fields as hidden at the end', () => {
    const merged = mergeColumns(saved, crmFields, VIRTUAL_PARENT_FIELD_DESCRIPTORS);
    const added = merged.find((c) => c.field === 'newField');
    expect(added).toMatchObject({ visible: false, label: 'Новое поле' });
    expect(added!.order).toBeGreaterThan(merged.filter((c) => c.field !== 'newField').length - 1);
  });

  it('drops orphan saved columns not in descriptors', () => {
    const merged = mergeColumns(saved, crmFields, VIRTUAL_PARENT_FIELD_DESCRIPTORS);
    expect(merged.some((c) => c.field === 'removedField')).toBe(false);
  });

  it('appends missing virtual columns with defaults', () => {
    const merged = mergeColumns(saved, crmFields, VIRTUAL_PARENT_FIELD_DESCRIPTORS);
    expect(merged.some((c) => c.field === 'summary')).toBe(true);
  });

  it('inserts missing stage after name as visible', () => {
    const merged = mergeColumns(saved, [
      ...crmFields,
      { field: 'stage', label: 'Stage', source: 'crm', fieldType: 'SELECT', isEditable: true },
    ]);
    const stage = merged.find((c) => c.field === 'stage');
    const name = merged.find((c) => c.field === 'name');
    expect(stage).toMatchObject({ visible: true, width: 148, label: 'Стадия' });
    expect(stage!.order).toBeGreaterThan(name!.order);
    expect(stage!.order).toBeLessThan(
      merged.find((c) => c.field === 'loadDate')?.order ?? Number.POSITIVE_INFINITY,
    );
  });

  it('preserves saved tipDetail order relative to stage', () => {
    const childFields: FieldDescriptor[] = [
      { field: 'name', label: 'Name', source: 'crm', fieldType: 'TEXT', isEditable: true },
      { field: 'stage', label: 'Stage', source: 'crm', fieldType: 'SELECT', isEditable: true },
      { field: 'tip', label: 'Tip', source: 'crm', fieldType: 'SELECT', isEditable: true },
      {
        field: 'tipDetail',
        label: 'Detail',
        source: 'crm',
        fieldType: 'SELECT',
        isEditable: true,
      },
    ];
    const childSaved: ColumnConfig[] = [
      { field: 'name', label: 'Name', order: 0, visible: true },
      { field: 'tip', label: 'Тип', order: 1, visible: true },
      { field: 'stage', label: 'Стадия', order: 2, visible: true },
      { field: 'tipDetail', label: 'Уточнение', order: 3, visible: true },
    ];

    const reordered: ColumnConfig[] = [
      { field: 'name', label: 'Name', order: 0, visible: true },
      { field: 'stage', label: 'Стадия', order: 1, visible: true },
      { field: 'tip', label: 'Тип', order: 2, visible: true },
      { field: 'tipDetail', label: 'Уточнение', order: 3, visible: true },
    ];

    const merged = mergeColumns(reordered, childFields);
    expect(merged.map((c) => c.field)).toEqual(['name', 'stage', 'tip', 'tipDetail']);
    expect(mergeColumns(childSaved, childFields).map((c) => c.field)).toEqual([
      'name',
      'tip',
      'stage',
      'tipDetail',
    ]);
  });

  it('inserts missing vzyal after name as visible', () => {
    const merged = mergeColumns(saved, [
      ...crmFields,
      { field: 'vzyal', label: 'Взял', source: 'crm', fieldType: 'SELECT', isEditable: true },
      { field: 'stage', label: 'Stage', source: 'crm', fieldType: 'SELECT', isEditable: true },
    ]);
    const name = merged.find((column) => column.field === 'name');
    const vzyal = merged.find((column) => column.field === 'vzyal');
    const stage = merged.find((column) => column.field === 'stage');
    expect(vzyal).toMatchObject({ visible: true, width: 110, label: 'Взял' });
    expect(vzyal!.order).toBeGreaterThan(name!.order);
    expect(vzyal!.order).toBeLessThan(stage!.order);
  });

  it('keeps saved hidden vzyal hidden', () => {
    const merged = mergeColumns(
      [
        ...saved,
        { field: 'vzyal', label: 'Взял', order: 1.5, visible: false, width: 110 },
      ],
      [
        ...crmFields,
        { field: 'vzyal', label: 'Взял', source: 'crm', fieldType: 'SELECT', isEditable: true },
      ],
    );
    expect(merged.find((column) => column.field === 'vzyal')).toMatchObject({
      visible: false,
      width: 110,
    });
  });

  it('inserts missing vzyal before saved stage', () => {
    const merged = mergeColumns(
      [
        { field: 'name', label: 'Сделка', order: 0, visible: true, width: 300 },
        { field: 'stage', label: 'Стадия', order: 1, visible: true, width: 148 },
      ],
      [
        { field: 'name', label: 'Сделка', source: 'crm', fieldType: 'TEXT', isEditable: true },
        { field: 'stage', label: 'Stage', source: 'crm', fieldType: 'SELECT', isEditable: true },
        { field: 'vzyal', label: 'Взял', source: 'crm', fieldType: 'SELECT', isEditable: true },
      ],
    );
    expect(merged.map((column) => column.field)).toEqual(['name', 'vzyal', 'stage']);
    expect(merged.find((column) => column.field === 'vzyal')).toMatchObject({
      visible: true,
      width: 110,
      label: 'Взял',
    });
  });
});

describe('DEFAULT_PARENT_COLUMNS', () => {
  it('places vzyal after name with sequential orders', () => {
    expect(DEFAULT_PARENT_COLUMNS.map((column) => column.field)).toEqual([
      'name',
      'vzyal',
      'stage',
      'loadDate',
      'companyName',
      'summary',
      'links',
    ]);
    expect(DEFAULT_PARENT_COLUMNS.map((column) => column.order)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(DEFAULT_PARENT_COLUMNS.find((column) => column.field === 'vzyal')).toMatchObject({
      label: 'Взял',
      visible: true,
      width: 110,
    });
  });
});
