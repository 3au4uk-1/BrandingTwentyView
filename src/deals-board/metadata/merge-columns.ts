import type { ColumnConfig } from '../types';
import { defaultWidthForFieldType } from './field-registry';
import type { FieldDescriptor } from './types';
import { VIRTUAL_PARENT_DEFAULTS } from './virtual-columns';

/** Prefer app constants when CRM metadata labels are mojibake / wrong encoding. */
const LABEL_OVERRIDES: Record<string, string> = {
  tip: 'Категория',
  stage: 'Стадия',
  tipDetail: 'Уточнение',
  kolichestvo: 'Кол-во',
  amount: 'Сумма',
  kommentariy: 'Комментарий',
  plenka: 'Плёнка',
  ssylkaNaMakety: 'Макеты',
  prevyuOkleyki: 'Превью',
  vzyal: 'Взял',
};

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

  const resolveLabel = (field: string, fallback: string) =>
    LABEL_OVERRIDES[field] ?? fallback;

  const merged: ColumnConfig[] = [];

  for (const saved of [...savedColumns].sort((a, b) => a.order - b.order)) {
    const descriptor = byField.get(saved.field);
    if (!descriptor) continue;
    merged.push({
      ...saved,
      label: resolveLabel(saved.field, descriptor.label),
      groupId: saved.groupId,
    });
  }

  let nextOrder = merged.reduce((max, column) => Math.max(max, column.order), -1) + 1;

  for (const descriptor of virtualDescriptors) {
    if (savedByField.has(descriptor.field)) continue;

    const virtualDefaults = VIRTUAL_PARENT_DEFAULTS[descriptor.field];
    merged.push({
      field: descriptor.field,
      label: resolveLabel(descriptor.field, descriptor.label),
      order: virtualDefaults?.order ?? nextOrder++,
      visible: virtualDefaults?.visible ?? false,
      width:
        virtualDefaults?.width ??
        defaultWidthForFieldType(descriptor.fieldType, descriptor.field),
    });
  }

  nextOrder = merged.reduce((max, column) => Math.max(max, column.order), -1) + 1;

  for (const descriptor of crmDescriptors) {
    if (savedByField.has(descriptor.field)) continue;

    const isStage = descriptor.field === 'stage';
    const isTipDetail = descriptor.field === 'tipDetail';
    const isPrevyu = descriptor.field === 'prevyuOkleyki';
    const isVzyal = descriptor.field === 'vzyal';
    const nameOrder = merged.find((column) => column.field === 'name')?.order;

    let order = nextOrder++;
    if (typeof nameOrder === 'number') {
      if (isVzyal) order = nameOrder + 0.25;
      else if (isStage) order = nameOrder + 0.5;
    }

    merged.push({
      field: descriptor.field,
      label: resolveLabel(descriptor.field, descriptor.label),
      order,
      visible: isStage || isTipDetail || isPrevyu || isVzyal,
      width: isVzyal
        ? 110
        : isStage
          ? 148
          : isTipDetail
            ? 140
            : isPrevyu
              ? 100
              : defaultWidthForFieldType(descriptor.fieldType, descriptor.field),
    });
  }

  // Preserve saved order (including tipDetail). Only missing tipDetail is seeded
  // near stage above — do not re-pin on every merge or ↑↓ in ColumnPicker is undone.
  return merged
    .sort((a, b) => a.order - b.order)
    .map((column, index) => ({ ...column, order: index }));
};
