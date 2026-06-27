export type BoardObjectName = 'opportunity' | 'dealLineItem';

export type SelectOption = { value: string; label: string };

export type FieldDescriptor = {
  field: string;
  label: string;
  source: 'crm' | 'virtual';
  fieldType?: string;
  isEditable: boolean;
  options?: SelectOption[];
};

export type RawFieldMetadata = {
  name: string;
  label: string;
  type: string;
  isActive?: boolean;
  isSystem?: boolean;
  isUIReadOnly?: boolean;
  options?: unknown;
};
