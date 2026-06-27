import type { FieldDescriptor, RawFieldMetadata, SelectOption } from './types';

const EDITABLE_TYPES = new Set(['TEXT', 'NUMBER', 'BOOLEAN', 'DATE', 'SELECT']);

export const isEditableFieldType = (type: string): boolean => EDITABLE_TYPES.has(type);

const parseSelectOptions = (raw: unknown): SelectOption[] | undefined => {
  if (!Array.isArray(raw)) return undefined;
  const options = raw
    .filter((item): item is { value: string; label: string } =>
      Boolean(item && typeof item === 'object' && typeof (item as { value?: unknown }).value === 'string'),
    )
    .map((item) => ({ value: item.value, label: String(item.label ?? item.value) }));
  return options.length ? options : undefined;
};

export const toFieldDescriptor = (raw: RawFieldMetadata): FieldDescriptor => ({
  field: raw.name,
  label: raw.label,
  source: 'crm',
  fieldType: raw.type,
  isEditable: !raw.isUIReadOnly && isEditableFieldType(raw.type),
  options: raw.type === 'SELECT' ? parseSelectOptions(raw.options) : undefined,
});

export const defaultWidthForFieldType = (fieldType: string | undefined, fieldName?: string): number => {
  if (fieldName === 'summary') return 200;
  if (fieldName === 'name') return 240;
  switch (fieldType) {
    case 'NUMBER':
      return 80;
    case 'DATE':
    case 'DATE_TIME':
      return 100;
    case 'BOOLEAN':
      return 60;
    case 'RICH_TEXT':
    case 'LINKS':
      return 120;
    case 'SELECT':
    case 'TEXT':
    default:
      return 160;
  }
};

export const filterActiveCrmFields = (fields: RawFieldMetadata[]): RawFieldMetadata[] =>
  fields.filter((field) => field.isActive !== false && field.isSystem !== true);
