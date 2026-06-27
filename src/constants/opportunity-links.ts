import type { FieldDescriptor } from 'src/deals-board/metadata/types';
import type { ColumnConfig } from 'src/deals-board/types';

export const PREFERRED_OPPORTUNITY_LINK_FIELD_NAMES = [
  'tonyLink',
  'bitrixLink',
  'tony',
  'bitrix',
  'bitriks',
] as const;

export const OPPORTUNITY_LINK_BUTTON_LABELS: Record<string, { shortLabel: string; title: string }> =
  {
    tonyLink: { shortLabel: 'T', title: 'Tony' },
    bitrixLink: { shortLabel: 'B', title: 'Bitrix' },
    tony: { shortLabel: 'T', title: 'Tony' },
    bitrix: { shortLabel: 'B', title: 'Bitrix' },
    bitriks: { shortLabel: 'B', title: 'Bitrix' },
  };

const matchesTonyField = (field: FieldDescriptor): boolean =>
  field.field === 'tonyLink' ||
  field.field === 'tony' ||
  /tony/i.test(field.field) ||
  /tony/i.test(field.label);

const matchesBitrixField = (field: FieldDescriptor): boolean =>
  field.field === 'bitrixLink' ||
  field.field === 'bitrix' ||
  field.field === 'bitriks' ||
  /bitrix/i.test(field.field) ||
  /bitriks/i.test(field.field) ||
  /bitrix/i.test(field.label) ||
  /bitriks/i.test(field.label) ||
  /битрик/i.test(field.label);

export const getOpportunityLinkButtonLabel = (
  fieldName: string,
  fieldLabel?: string,
): { shortLabel: string; title: string } => {
  const preset = OPPORTUNITY_LINK_BUTTON_LABELS[fieldName];
  if (preset) return preset;

  if (/tony/i.test(fieldName) || /tony/i.test(fieldLabel ?? '')) {
    return { shortLabel: 'T', title: 'Tony' };
  }

  if (/bitrix/i.test(fieldName) || /bitriks/i.test(fieldName) || /bitrix/i.test(fieldLabel ?? '') || /bitriks/i.test(fieldLabel ?? '') || /битрик/i.test(fieldLabel ?? '')) {
    return { shortLabel: 'B', title: 'Bitrix' };
  }

  const title = fieldLabel ?? fieldName;
  return {
    shortLabel: title.trim().charAt(0).toUpperCase() || '?',
    title,
  };
};

const isLinksColumnVisible = (columns: ColumnConfig[]): boolean =>
  columns.some((column) => column.visible && column.field === 'links');

export const resolveOpportunityLinkFieldNames = (
  columns: ColumnConfig[],
  availableFields: readonly FieldDescriptor[],
): string[] => {
  if (!isLinksColumnVisible(columns)) {
    return [];
  }

  const linkFields = availableFields.filter((field) => field.fieldType === 'LINKS');
  const linkFieldNames = new Set(linkFields.map((field) => field.field));

  const preferred = PREFERRED_OPPORTUNITY_LINK_FIELD_NAMES.filter((field) =>
    linkFieldNames.has(field),
  );
  if (preferred.length > 0) {
    return [...preferred];
  }

  const tonyField = linkFields.find(matchesTonyField);
  const bitrixField = linkFields.find(matchesBitrixField);
  const resolved = [tonyField?.field, bitrixField?.field].filter(
    (field): field is string => Boolean(field),
  );
  if (resolved.length > 0) {
    return resolved;
  }

  if (linkFields.length > 0) {
    return linkFields.map((field) => field.field).sort();
  }

  // Workspace link fields are available via REST even when metadata fieldsList omits them.
  return ['tonyLink', 'bitrixLink'];
};

export const resolveOpportunityLinkFieldDescriptors = (
  columns: ColumnConfig[],
  availableFields: readonly FieldDescriptor[],
): FieldDescriptor[] => {
  const fieldNames = resolveOpportunityLinkFieldNames(columns, availableFields);
  const descriptorByField = new Map(availableFields.map((field) => [field.field, field]));

  return fieldNames.map((fieldName) => {
    const descriptor = descriptorByField.get(fieldName);
    if (descriptor) return descriptor;

    return {
      field: fieldName,
      label: getOpportunityLinkButtonLabel(fieldName).title,
      source: 'crm' as const,
      fieldType: 'LINKS',
      isEditable: false,
    };
  });
};

export const isOpportunityLinkField = (
  fieldName: string,
  availableFields: readonly FieldDescriptor[],
): boolean => {
  const descriptor = availableFields.find((field) => field.field === fieldName);
  if (descriptor?.fieldType === 'LINKS') {
    return true;
  }

  return (
    fieldName.endsWith('Link') ||
    PREFERRED_OPPORTUNITY_LINK_FIELD_NAMES.includes(
      fieldName as (typeof PREFERRED_OPPORTUNITY_LINK_FIELD_NAMES)[number],
    )
  );
};
