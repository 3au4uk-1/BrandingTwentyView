import { isOpportunityLinkField } from 'src/constants/opportunity-links';

import type { ColumnConfig } from '../types';
import type { FieldDescriptor } from './types';

const VIRTUAL_FIELDS = new Set(['summary', 'companyName', 'links']);

/** CRM fields for Core GraphQL. Link fields are fetched separately via REST. */
export const crmFieldNamesFromColumns = (
  columns: ColumnConfig[],
  availableFields: readonly FieldDescriptor[] = [],
): string[] => {
  const names = new Set<string>();
  for (const column of columns.filter((item) => item.visible)) {
    if (VIRTUAL_FIELDS.has(column.field)) continue;
    if (isOpportunityLinkField(column.field, availableFields)) continue;
    names.add(column.field);
  }

  return [...names];
};

export const needsCompanyRelation = (columns: ColumnConfig[]): boolean =>
  columns.some(
    (column) => column.visible && (column.field === 'companyName' || column.field === 'company'),
  );
