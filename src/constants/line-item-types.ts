export const LINE_ITEM_TYPES = [
  { value: 'BANNERA', label: 'Баннера', color: 'green' },
  { value: 'PLENKA', label: 'Плёнка', color: 'blue' },
  { value: 'PODRYAD', label: 'Подряд', color: 'purple' },
  { value: 'PROIZVODSTVO', label: 'Производство', color: 'orange' },
  { value: 'RESTAVRACIYA', label: 'Рест. плёнка', color: 'pink' },
  /** Deprecated as a tip — prefer PLENKA + tipDetail NE_NASHI. Still readable. */
  { value: 'NE_NASHE', label: 'Не наше', color: 'gray' },
] as const;

export type LineItemType = (typeof LINE_ITEM_TYPES)[number]['value'];

/** Types offered when creating / changing tip (hides deprecated NE_NASHE). */
export const LINE_ITEM_TYPES_FOR_PICKER = LINE_ITEM_TYPES.filter(
  (type) => type.value !== 'NE_NASHE',
);

const findType = (value: string) => LINE_ITEM_TYPES.find((type) => type.value === value);

export const getLineItemTypeLabel = (value: string): string =>
  findType(value)?.label ?? value;

export const getLineItemTypeColor = (value: string): string =>
  findType(value)?.color ?? 'gray';
