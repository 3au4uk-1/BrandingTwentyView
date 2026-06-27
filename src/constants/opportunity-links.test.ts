import { describe, expect, it } from 'vitest';

import {
  getOpportunityLinkButtonLabel,
  resolveOpportunityLinkFieldDescriptors,
  resolveOpportunityLinkFieldNames,
} from 'src/constants/opportunity-links';
import type { FieldDescriptor } from 'src/deals-board/metadata/types';
import type { ColumnConfig } from 'src/deals-board/types';

describe('resolveOpportunityLinkFieldNames', () => {
  const columns: ColumnConfig[] = [
    { field: 'name', label: 'Name', order: 0, visible: true },
    { field: 'links', label: 'Links', order: 1, visible: true },
  ];

  it('matches Tony and Bitrix fields by label when API names differ', () => {
    const availableFields: FieldDescriptor[] = [
      {
        field: 'customTony',
        label: 'Tony',
        source: 'crm',
        fieldType: 'LINKS',
        isEditable: false,
      },
      {
        field: 'customBitrix',
        label: 'Bitrix',
        source: 'crm',
        fieldType: 'LINKS',
        isEditable: false,
      },
    ];

    expect(resolveOpportunityLinkFieldNames(columns, availableFields)).toEqual([
      'customTony',
      'customBitrix',
    ]);
  });

  it('matches Bitrix field by Cyrillic label', () => {
    const availableFields: FieldDescriptor[] = [
      {
        field: 'someBitrixField',
        label: 'Битрикс',
        source: 'crm',
        fieldType: 'LINKS',
        isEditable: false,
      },
    ];

    expect(resolveOpportunityLinkFieldNames(columns, availableFields)).toEqual(['someBitrixField']);
  });

  it('falls back to workspace Tony and Bitrix fields when metadata omits them', () => {
    expect(resolveOpportunityLinkFieldNames(columns, [])).toEqual(['tonyLink', 'bitrixLink']);
  });
});

describe('resolveOpportunityLinkFieldDescriptors', () => {
  const columns: ColumnConfig[] = [
    { field: 'links', label: 'Links', order: 0, visible: true },
  ];

  it('creates synthetic descriptors for fallback link fields', () => {
    expect(resolveOpportunityLinkFieldDescriptors(columns, [])).toEqual([
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
    ]);
  });
});

describe('getOpportunityLinkButtonLabel', () => {
  it('derives Tony and Bitrix button labels from field metadata', () => {
    expect(getOpportunityLinkButtonLabel('customTony', 'Tony')).toEqual({
      shortLabel: 'T',
      title: 'Tony',
    });
    expect(getOpportunityLinkButtonLabel('customBitrix', 'Bitrix')).toEqual({
      shortLabel: 'B',
      title: 'Bitrix',
    });
  });
});
