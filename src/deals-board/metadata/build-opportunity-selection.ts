const LINK_FIELD_NAMES = new Set(['tonyLink', 'bitrixLink', 'ssylkaNaMakety']);

const shouldIncludeCompanyRelation = (
  visibleCrmFieldNames: string[],
  includeCompanyRelation: boolean,
): boolean =>
  includeCompanyRelation ||
  visibleCrmFieldNames.some((field) => field === 'companyName' || field === 'company');

export const buildOpportunityNodeSelection = (
  visibleCrmFieldNames: string[],
  includeCompanyRelation = false,
): Record<string, unknown> => {
  const selection: Record<string, unknown> = {
    id: true,
    name: true,
    companyId: true,
  };

  if (shouldIncludeCompanyRelation(visibleCrmFieldNames, includeCompanyRelation)) {
    selection.company = { id: true, name: true };
  }

  for (const field of visibleCrmFieldNames) {
    if (field === 'company' || field === 'companyName') continue;
    if (field === 'amount') {
      selection.amount = { amountMicros: true, currencyCode: true };
      continue;
    }
    if (LINK_FIELD_NAMES.has(field) || field.endsWith('Link')) {
      selection[field] = { primaryLinkUrl: true, primaryLinkLabel: true };
      continue;
    }
    selection[field] = true;
  }

  return selection;
};
