import { describe, expect, it } from 'vitest';

import type { FieldDescriptor } from 'src/deals-board/metadata/types';
import type { ColumnConfig } from 'src/deals-board/types';

import {
  isOpportunityRestOnlyField,
  resolveOpportunityRestFieldNames,
} from './opportunity-rest-fields';

describe('isOpportunityRestOnlyField', () => {
  const availableFields: FieldDescriptor[] = [
    {
      field: 'summaPostupleniy',
      label: 'Сумма поступлений',
      source: 'crm',
      fieldType: 'CURRENCY',
      isEditable: false,
    },
    {
      field: 'tonyLink',
      label: 'Tony',
      source: 'crm',
      fieldType: 'LINKS',
      isEditable: false,
    },
  ];

  it('treats known GraphQL fields as not REST-only', () => {
    expect(isOpportunityRestOnlyField('loadDate', availableFields)).toBe(false);
    expect(isOpportunityRestOnlyField('amount', availableFields)).toBe(false);
  });

  it('treats custom metadata fields as REST-only', () => {
    expect(isOpportunityRestOnlyField('summaPostupleniy', availableFields)).toBe(true);
  });

  it('treats link fields as REST-only', () => {
    expect(isOpportunityRestOnlyField('tonyLink', availableFields)).toBe(true);
  });

  it('treats vzyal as REST-only when present in metadata', () => {
    expect(
      isOpportunityRestOnlyField('vzyal', [
        {
          field: 'vzyal',
          label: 'Взял',
          source: 'crm',
          fieldType: 'SELECT',
          isEditable: true,
        },
      ]),
    ).toBe(true);
  });
});

describe('resolveOpportunityRestFieldNames', () => {
  const availableFields: FieldDescriptor[] = [
    {
      field: 'summaPostupleniy',
      label: 'Сумма поступлений',
      source: 'crm',
      fieldType: 'CURRENCY',
      isEditable: false,
    },
    {
      field: 'tonyLink',
      label: 'Tony',
      source: 'crm',
      fieldType: 'LINKS',
      isEditable: false,
    },
    {
      field: 'bitrixLink',
      label: 'Bitrix',
      source: 'crm',
      fieldType: 'LINKS',
      isEditable: false,
    },
  ];

  it('includes custom currency fields visible as individual columns', () => {
    const columns: ColumnConfig[] = [
      { field: 'name', label: 'Name', order: 0, visible: true },
      { field: 'summaPostupleniy', label: 'Сумма поступлений', order: 1, visible: true },
    ];

    expect(resolveOpportunityRestFieldNames(columns, availableFields)).toEqual(['summaPostupleniy']);
  });

  it('includes Tony and Bitrix when links virtual column is visible', () => {
    const columns: ColumnConfig[] = [
      { field: 'name', label: 'Name', order: 0, visible: true },
      { field: 'links', label: 'Links', order: 1, visible: true },
    ];

    expect(resolveOpportunityRestFieldNames(columns, availableFields)).toEqual([
      'tonyLink',
      'bitrixLink',
    ]);
  });

  it('includes individual link columns without links virtual column', () => {
    const columns: ColumnConfig[] = [
      { field: 'name', label: 'Name', order: 0, visible: true },
      { field: 'tonyLink', label: 'Tony', order: 1, visible: true },
    ];

    expect(resolveOpportunityRestFieldNames(columns, availableFields)).toEqual(['tonyLink']);
  });
});
