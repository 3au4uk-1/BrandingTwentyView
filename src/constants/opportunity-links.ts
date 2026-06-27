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

export const resolveOpportunityLinkFieldNames = (
  columns: ColumnConfig[],
  availableFields: readonly FieldDescriptor[],
): string[] => {
  if (!columns.some((column) => column.visible && column.field === 'links')) {
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

  return linkFields.map((field) => field.field).sort();
};

export const resolveOpportunityLinkFieldDescriptors = (
  columns: ColumnConfig[],
  availableFields: readonly FieldDescriptor[],
): FieldDescriptor[] => {
  const fieldNames = resolveOpportunityLinkFieldNames(columns, availableFields);
  const descriptorByField = new Map(availableFields.map((field) => [field.field, field]));

  return fieldNames
    .map((fieldName) => descriptorByField.get(fieldName))
    .filter((field): field is FieldDescriptor => Boolean(field));
};
