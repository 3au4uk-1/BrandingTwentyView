import type { FieldDescriptor } from 'src/deals-board/metadata/types';
import type { ColumnConfig } from 'src/deals-board/types';

import { isOpportunityLinkField, resolveOpportunityLinkFieldNames } from './opportunity-links';

const VIRTUAL_FIELDS = new Set(['summary', 'companyName', 'links']);

/** Opportunity fields known to be available on the Core GraphQL `Opportunity` type. */
export const OPPORTUNITY_KNOWN_GRAPHQL_FIELDS = new Set([
  'name',
  'loadDate',
  'closeDate',
  'stage',
  'stageZakreplen',
  'amount',
  'oplata',
  'company',
  'companyId',
]);

export const isOpportunityRestOnlyField = (
  fieldName: string,
  availableFields: readonly FieldDescriptor[] = [],
): boolean => {
  if (isOpportunityLinkField(fieldName, availableFields)) {
    return true;
  }

  if (OPPORTUNITY_KNOWN_GRAPHQL_FIELDS.has(fieldName)) {
    return false;
  }

  const descriptor = availableFields.find((field) => field.field === fieldName);
  return Boolean(descriptor);
};

export const resolveOpportunityRestFieldNames = (
  columns: ColumnConfig[],
  availableFields: readonly FieldDescriptor[] = [],
): string[] => {
  const names = new Set<string>();

  for (const field of resolveOpportunityLinkFieldNames(columns, availableFields)) {
    names.add(field);
  }

  for (const column of columns.filter((item) => item.visible)) {
    if (VIRTUAL_FIELDS.has(column.field)) continue;
    if (!isOpportunityRestOnlyField(column.field, availableFields)) continue;
    names.add(column.field);
  }

  return [...names];
};
