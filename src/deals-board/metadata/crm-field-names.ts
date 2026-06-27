import type { ColumnConfig } from '../types';

const VIRTUAL_FIELDS = new Set(['summary', 'companyName', 'links']);

export const crmFieldNamesFromColumns = (columns: ColumnConfig[]): string[] => {
  const names = new Set<string>();
  for (const column of columns.filter((item) => item.visible)) {
    if (VIRTUAL_FIELDS.has(column.field)) {
      if (column.field === 'links') {
        names.add('tonyLink');
        names.add('bitrixLink');
      }
      continue;
    }
    names.add(column.field);
  }
  return [...names];
};

export const needsCompanyRelation = (columns: ColumnConfig[]): boolean =>
  columns.some(
    (column) => column.visible && (column.field === 'companyName' || column.field === 'company'),
  );
