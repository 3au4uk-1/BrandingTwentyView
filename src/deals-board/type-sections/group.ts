export type TypeSectionKey =
  | 'RESTAVRACIYA'
  | 'PLENKA'
  | 'BANNERA'
  | 'PODRYAD'
  | 'PROIZVODSTVO'
  | 'NE_NASHE'
  | 'UNKNOWN';

export type TypeSectionRow =
  | { kind: 'separator'; key: TypeSectionKey; label: string }
  | { kind: 'item'; item: { id: string; tip?: string | null } };

const LABELS: Record<TypeSectionKey, string> = {
  RESTAVRACIYA: 'Реставрация',
  PLENKA: 'Плёнка',
  BANNERA: 'Баннера',
  PODRYAD: 'Подряд',
  PROIZVODSTVO: 'Производство',
  NE_NASHE: 'Не наше',
  UNKNOWN: 'Без типа',
};

export const TYPE_SECTION_ORDER: TypeSectionKey[] = [
  'RESTAVRACIYA',
  'PLENKA',
  'BANNERA',
  'PODRYAD',
  'PROIZVODSTVO',
  'NE_NASHE',
  'UNKNOWN',
];

export const getTypeSectionKey = (tip: string | null | undefined): TypeSectionKey => {
  if (tip === 'RESTAVRACIYA') return 'RESTAVRACIYA';
  if (tip === 'PLENKA') return 'PLENKA';
  if (tip === 'BANNERA') return 'BANNERA';
  if (tip === 'PODRYAD') return 'PODRYAD';
  if (tip === 'PROIZVODSTVO') return 'PROIZVODSTVO';
  if (tip === 'NE_NASHE') return 'NE_NASHE';
  return 'UNKNOWN';
};

export const buildTypeSectionRows = <T extends { id: string; tip?: string | null }>(
  items: T[],
): Array<{ kind: 'separator'; key: TypeSectionKey; label: string } | { kind: 'item'; item: T }> => {
  const buckets = new Map<TypeSectionKey, T[]>();
  for (const key of TYPE_SECTION_ORDER) buckets.set(key, []);
  for (const item of items) {
    buckets.get(getTypeSectionKey(item.tip))!.push(item);
  }
  const rows: Array<
    { kind: 'separator'; key: TypeSectionKey; label: string } | { kind: 'item'; item: T }
  > = [];
  for (const key of TYPE_SECTION_ORDER) {
    const group = buckets.get(key)!;
    if (!group.length) continue;
    rows.push({ kind: 'separator', key, label: LABELS[key] });
    for (const item of group) rows.push({ kind: 'item', item });
  }
  return rows;
};
