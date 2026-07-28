import {
  getDefaultRestorationMaket,
  isMaketLinkEmpty,
  toSsylkaNaMakety,
  type MaketLinkValue,
} from 'src/constants/standard-restoration-makets';

export type RestorationMaketAutoPatch = {
  ssylkaNaMakety: { primaryLinkUrl: string; primaryLinkLabel: string };
};

/**
 * When tip becomes RESTAVRACIYA and maket link is empty, fill the default catalog entry.
 * Does not overwrite an existing link.
 */
export const planRestorationMaketAuto = (
  previousTip: string | null | undefined,
  nextTip: string | null | undefined,
  currentLink: MaketLinkValue | null | undefined,
): RestorationMaketAutoPatch | null => {
  if (nextTip !== 'RESTAVRACIYA') return null;
  if (previousTip === 'RESTAVRACIYA') return null;
  if (!isMaketLinkEmpty(currentLink)) return null;
  return { ssylkaNaMakety: toSsylkaNaMakety(getDefaultRestorationMaket()) };
};
