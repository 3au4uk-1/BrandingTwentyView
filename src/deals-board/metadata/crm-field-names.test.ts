import { describe, expect, it } from 'vitest';
import type { ColumnConfig } from '../types';
import { crmFieldNamesFromColumns } from './crm-field-names';

describe('crmFieldNamesFromColumns', () => {
  it('skips virtual columns but maps companyName to company fetch needs', () => {
    const columns: ColumnConfig[] = [
      { field: 'name', label: 'Name', order: 0, visible: true },
      { field: 'summary', label: 'Summary', order: 1, visible: true },
      { field: 'loadDate', label: 'Date', order: 2, visible: true },
    ];
    expect(crmFieldNamesFromColumns(columns)).toEqual(['name', 'loadDate']);
  });
});
