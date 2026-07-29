import {
  isMaketLinkEmpty,
  pickRestorationMaket,
  STANDARD_RESTORATION_MAKETS,
  toSsylkaNaMakety,
  type MaketLinkValue,
  type RestorationMaketCatalogEntry,
} from 'src/constants/standard-restoration-makets';

export type RestorationMaketAutoPatch = {
  ssylkaNaMakety: { primaryLinkUrl: string; primaryLinkLabel: string };
};

/**
 * When tip becomes RESTAVRACIYA and maket link is empty, fill from catalog (keyword match or default).
 * Does not overwrite an existing link.
 */
export const planRestorationMaketAuto = (
  previousTip: string | null | undefined,
  nextTip: string | null | undefined,
  currentLink: MaketLinkValue | null | undefined,
  options?: {
    lineItemName?: string | null;
    catalog?: RestorationMaketCatalogEntry[];
  },
): RestorationMaketAutoPatch | null => {
  if (nextTip !== 'RESTAVRACIYA') return null;
  if (previousTip === 'RESTAVRACIYA') return null;
  if (!isMaketLinkEmpty(currentLink)) return null;
  const catalog = options?.catalog ?? STANDARD_RESTORATION_MAKETS;
  const picked = pickRestorationMaket(catalog, options?.lineItemName);
  if (!picked) return null;
  return { ssylkaNaMakety: toSsylkaNaMakety(picked) };
};
