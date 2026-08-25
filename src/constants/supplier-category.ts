export const SUPPLIER_CATEGORY_OPTIONS = [
  { value: 'BANNERA', label: 'Баннера', color: 'green' },
  { value: 'PODRYAD', label: 'Подряд', color: 'purple' },
  { value: 'PLENKA', label: 'Плёнка', color: 'blue' },
  { value: 'PROIZVODSTVO', label: 'Производство', color: 'orange' },
  { value: 'RESTAVRACIYA', label: 'Рест. плёнка', color: 'pink' },
] as const;

export type SupplierCategory = (typeof SUPPLIER_CATEGORY_OPTIONS)[number]['value'];
