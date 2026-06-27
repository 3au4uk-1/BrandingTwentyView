import type { FieldDescriptor } from './types';

export const VIRTUAL_PARENT_FIELD_DESCRIPTORS: FieldDescriptor[] = [
  { field: 'summary', label: 'Сводка позиций', source: 'virtual', isEditable: false },
  { field: 'companyName', label: 'Компания', source: 'virtual', isEditable: false },
  { field: 'links', label: 'Ссылки', source: 'virtual', isEditable: false },
];

export const VIRTUAL_PARENT_DEFAULTS: Record<string, { visible: boolean; width: number; order: number }> = {
  summary: { visible: true, width: 200, order: 3 },
  companyName: { visible: true, width: 160, order: 2 },
  links: { visible: false, width: 80, order: 4 },
};
