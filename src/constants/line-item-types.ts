export const LINE_ITEM_TYPES = [
  { value: 'BANNERA', label: 'Баннера', color: 'blue' },
  { value: 'PLENKA', label: 'Плёнка', color: 'green' },
  { value: 'PODRYAD', label: 'Подряд', color: 'purple' },
] as const;

export type LineItemType = (typeof LINE_ITEM_TYPES)[number]['value'];

const findType = (value: string) => LINE_ITEM_TYPES.find((type) => type.value === value);

export const getLineItemTypeLabel = (value: string): string =>
  findType(value)?.label ?? value;

export const getLineItemTypeColor = (value: string): string =>
  findType(value)?.color ?? 'gray';
