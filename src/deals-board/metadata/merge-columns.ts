import type { ColumnConfig } from '../types';
import { defaultWidthForFieldType } from './field-registry';
import type { FieldDescriptor } from './types';
import { VIRTUAL_PARENT_DEFAULTS } from './virtual-columns';

const descriptorMap = (descriptors: FieldDescriptor[]) =>
  new Map(descriptors.map((descriptor) => [descriptor.field, descriptor]));

export const mergeColumns = (
  savedColumns: ColumnConfig[],
  crmDescriptors: FieldDescriptor[],
  virtualDescriptors: FieldDescriptor[] = [],
): ColumnConfig[] => {
  const allDescriptors = [...crmDescriptors, ...virtualDescriptors];
  const byField = descriptorMap(allDescriptors);
  const savedByField = new Map(savedColumns.map((column) => [column.field, column]));

  const merged: ColumnConfig[] = [];

  for (const saved of [...savedColumns].sort((a, b) => a.order - b.order)) {
    const descriptor = byField.get(saved.field);
    if (!descriptor) continue;
    merged.push({
      ...saved,
      label: descriptor.label,
    });
  }

  let nextOrder = merged.reduce((max, column) => Math.max(max, column.order), -1) + 1;

  for (const descriptor of virtualDescriptors) {
    if (savedByField.has(descriptor.field)) continue;

    const virtualDefaults = VIRTUAL_PARENT_DEFAULTS[descriptor.field];
    merged.push({
      field: descriptor.field,
      label: descriptor.label,
      order: virtualDefaults?.order ?? nextOrder++,
      visible: virtualDefaults?.visible ?? false,
      width: virtualDefaults?.width ?? defaultWidthForFieldType(descriptor.fieldType, descriptor.field),
    });
  }

  nextOrder = merged.reduce((max, column) => Math.max(max, column.order), -1) + 1;

  for (const descriptor of crmDescriptors) {
    if (savedByField.has(descriptor.field)) continue;

    merged.push({
      field: descriptor.field,
      label: descriptor.label,
      order: nextOrder++,
      visible: false,
      width: defaultWidthForFieldType(descriptor.fieldType, descriptor.field),
    });
  }

  return merged.sort((a, b) => a.order - b.order);
};
