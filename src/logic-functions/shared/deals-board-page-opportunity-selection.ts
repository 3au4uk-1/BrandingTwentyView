const LINK_FIELD_NAMES = new Set(['tonyLink', 'bitrixLink', 'ssylkaNaMakety']);

const CURRENCY_SELECTION = { amountMicros: true, currencyCode: true };
const LINKS_SELECTION = {
  primaryLinkUrl: true,
  primaryLinkLabel: true,
  secondaryLinks: true,
};
const RELATION_SELECTION = { id: true, name: true };
const RICH_TEXT_SELECTION = { markdown: true };

/** Core GraphQL has no workspace link fields — fetch tony/bitrix via REST after query. */
export const CHILD_SMETA_NODE_SELECTION: Record<string, unknown> = {
  id: true,
  name: true,
  parentOpportunityId: true,
};

export const CHILD_SMETA_REST_LINK_FIELDS = ['tonyLink', 'bitrixLink'] as const;

const shouldIncludeCompanyRelation = (
  visibleCrmFieldNames: string[],
  includeCompanyRelation: boolean,
): boolean =>
  includeCompanyRelation ||
  visibleCrmFieldNames.some((field) => field === 'companyName' || field === 'company');

export const selectionForFieldType = (
  field: string,
  fieldType?: string,
): Record<string, unknown> | true => {
  switch (fieldType) {
    case 'CURRENCY':
      return CURRENCY_SELECTION;
    case 'LINKS':
      return LINKS_SELECTION;
    case 'RELATION':
      return RELATION_SELECTION;
    case 'RICH_TEXT':
      return RICH_TEXT_SELECTION;
    default:
      if (LINK_FIELD_NAMES.has(field) || field.endsWith('Link')) {
        return LINKS_SELECTION;
      }
      return true;
  }
};

export const buildOpportunityNodeSelection = (
  visibleCrmFieldNames: string[],
  includeCompanyRelation = false,
  fieldTypesByName: Readonly<Record<string, string>> = {},
): Record<string, unknown> => {
  const selection: Record<string, unknown> = {
    id: true,
    name: true,
    companyId: true,
  };

  if (shouldIncludeCompanyRelation(visibleCrmFieldNames, includeCompanyRelation)) {
    selection.company = RELATION_SELECTION;
  }

  for (const field of visibleCrmFieldNames) {
    if (field === 'company' || field === 'companyName') continue;
    selection[field] = selectionForFieldType(field, fieldTypesByName[field]);
  }

  selection.closeDate = true;

  return selection;
};
