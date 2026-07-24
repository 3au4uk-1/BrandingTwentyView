import type { LineItemType } from './line-item-types';

/** TipDetail options — flat CRM SELECT; UI filters by tip. */
export const TIP_DETAIL_OPTIONS = [
  { value: 'NASHI', label: 'Наши', color: 'green' },
  { value: 'NE_NASHI', label: 'Не наши', color: 'gray' },
  { value: 'YURA', label: 'Юра', color: 'blue' },
  { value: 'MAGA', label: 'Мага', color: 'purple' },
  { value: 'TOPILSKIY', label: 'Топильский', color: 'orange' },
  { value: 'GLAV_PRINT', label: 'Глав принт', color: 'purple' },
  { value: 'PASHA_VINDER', label: 'Паша виндер', color: 'blue' },
  { value: 'ZARYA', label: 'Заря', color: 'yellow' },
  { value: 'LIZA_SUKNO', label: 'Лиза сукно', color: 'pink' },
  { value: 'KUVALDIN_KLISHE', label: 'Кувалдин клише', color: 'orange' },
  { value: 'SVOE', label: 'Своё', color: 'gray' },
  { value: 'ROLL_UP', label: 'Ролл-ап', color: 'blue' },
  { value: 'POP_UP', label: 'Поп-ап', color: 'purple' },
  { value: 'PROMO_STOYKA', label: 'Промо-стойка', color: 'green' },
  { value: 'PROIZVODSTVO_DRUGOE', label: 'Другое', color: 'gray' },
] as const;

export type TipDetailValue = (typeof TIP_DETAIL_OPTIONS)[number]['value'];

export const TIP_DETAIL_BY_TIP: Partial<Record<LineItemType, readonly TipDetailValue[]>> = {
  PLENKA: ['NASHI', 'NE_NASHI'],
  BANNERA: ['YURA', 'MAGA', 'TOPILSKIY'],
  PODRYAD: ['GLAV_PRINT', 'PASHA_VINDER', 'ZARYA', 'LIZA_SUKNO', 'KUVALDIN_KLISHE', 'SVOE'],
  PROIZVODSTVO: ['ROLL_UP', 'POP_UP', 'PROMO_STOYKA', 'PROIZVODSTVO_DRUGOE'],
};

export const DEFAULT_TIP_DETAIL_BY_TIP: Partial<Record<LineItemType, TipDetailValue>> = {
  PLENKA: 'NASHI',
};

export const getTipDetailOptionsForTip = (tip: string | null | undefined) => {
  if (!tip) return [];
  const allowed = TIP_DETAIL_BY_TIP[tip as LineItemType];
  if (!allowed?.length) return [];
  return TIP_DETAIL_OPTIONS.filter((option) =>
    (allowed as readonly string[]).includes(option.value),
  );
};

export const getTipDetailLabel = (value: string): string =>
  TIP_DETAIL_OPTIONS.find((option) => option.value === value)?.label ?? value;

export const isTipDetailValidForTip = (
  tip: string | null | undefined,
  tipDetail: string | null | undefined,
): boolean => {
  if (!tipDetail) return true;
  if (!tip) return false;
  const allowed = TIP_DETAIL_BY_TIP[tip as LineItemType];
  return Boolean(allowed && (allowed as readonly string[]).includes(tipDetail));
};
