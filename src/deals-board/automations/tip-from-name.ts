import type { LineItemType } from 'src/constants/line-item-types';

/**
 * Priority order: first match wins (more specific / less ambiguous first).
 * Name always overwrites tip when a rule matches (policy A).
 */
const NAME_TIP_RULES: ReadonlyArray<{ tip: LineItemType; needles: readonly string[] }> = [
  { tip: 'RESTAVRACIYA', needles: ['реставрац'] },
  { tip: 'PODRYAD', needles: ['подряд'] },
  { tip: 'PROIZVODSTVO', needles: ['производств'] },
  { tip: 'BANNERA', needles: ['баннер'] },
  { tip: 'PLENKA', needles: ['брендинг', 'оклейк', 'плёнк', 'пленк'] },
];

const normalizeName = (name: string | null | undefined): string =>
  (name || '').toLowerCase().replace(/\s+/g, ' ').trim();

/** Infer tip from line-item name keywords, or null if no rule matches. */
export const inferTipFromName = (name: string | null | undefined): LineItemType | null => {
  const n = normalizeName(name);
  if (!n) return null;

  for (const rule of NAME_TIP_RULES) {
    if (rule.needles.some((needle) => n.includes(needle))) {
      return rule.tip;
    }
  }

  return null;
};

/**
 * Returns a tip patch when name implies a tip different from current.
 * Always overwrites mismatched tip (including manually set).
 */
export const planTipFromName = (
  name: string | null | undefined,
  currentTip: string | null | undefined,
): { tip: LineItemType } | null => {
  const inferred = inferTipFromName(name);
  if (!inferred) return null;
  if (currentTip === inferred) return null;
  return { tip: inferred };
};
