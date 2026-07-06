import { describe, expect, it } from 'vitest';

import { resolveOpportunityLinkFieldNames } from 'src/constants/opportunity-links';

import type { FieldDescriptor } from '../metadata/types';
import type { ColumnConfig } from '../types';
import { crmFieldNamesFromColumns } from './crm-field-names';

describe('crmFieldNamesFromColumns', () => {
  const linkFields: FieldDescriptor[] = [
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

  it('skips virtual columns but maps companyName to company fetch needs', () => {
    const columns: ColumnConfig[] = [
      { field: 'name', label: 'Name', order: 0, visible: true },
      { field: 'summary', label: 'Summary', order: 1, visible: true },
      { field: 'loadDate', label: 'Date', order: 2, visible: true },
    ];
    expect(crmFieldNamesFromColumns(columns)).toEqual(['name', 'loadDate']);
  });

  it('does not request link fields in GraphQL when metadata has none', () => {
    const columns: ColumnConfig[] = [
      { field: 'name', label: 'Name', order: 0, visible: true },
      { field: 'links', label: 'Links', order: 1, visible: true },
    ];
    expect(crmFieldNamesFromColumns(columns, [])).toEqual(['name']);
  });

  it('skips visible LINKS columns in GraphQL selection', () => {
    const columns: ColumnConfig[] = [
      { field: 'name', label: 'Name', order: 0, visible: true },
      { field: 'tonyLink', label: 'Tony', order: 1, visible: true },
    ];
    expect(crmFieldNamesFromColumns(columns, linkFields)).toEqual(['name']);
  });

  it('skips REST-only custom fields in GraphQL selection', () => {
    const columns: ColumnConfig[] = [
      { field: 'name', label: 'Name', order: 0, visible: true },
      { field: 'summaPostupleniy', label: 'Сумма поступлений', order: 1, visible: true },
    ];
    const availableFields: FieldDescriptor[] = [
      {
        field: 'summaPostupleniy',
        label: 'Сумма поступлений',
        source: 'crm',
        fieldType: 'CURRENCY',
        isEditable: false,
      },
    ];
    expect(crmFieldNamesFromColumns(columns, availableFields)).toEqual(['name']);
  });
});
