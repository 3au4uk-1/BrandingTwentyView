export type StandardRestorationMaket = {
  id: string;
  label: string;
  url: string;
  /** Used for auto-fill when tip → RESTAVRACIYA and link empty. */
  isDefault?: boolean;
};

/**
 * Demo catalog — replace URLs with real Cloud/Drive links when ready.
 * Kept in code (wave 4 decision A) so the board works without a CRM directory object.
 */
export const STANDARD_RESTORATION_MAKETS: StandardRestorationMaket[] = [
  {
    id: '3ad70671-7add-4936-93ae-76e719162357',
    label: 'Стандарт реставрации',
    url: 'https://example.com/makets/restoration-standard',
    isDefault: true,
  },
  {
    id: '6a5f13eb-93e5-4c68-b0c2-211bbce43839',
    label: 'Рест. корпус',
    url: 'https://example.com/makets/restoration-corpus',
  },
  {
    id: '99f21780-1e11-441d-90ff-d3a6c394369f',
    label: 'Рест. фасад',
    url: 'https://example.com/makets/restoration-facade',
  },
];

export type MaketLinkValue = {
  primaryLinkUrl?: string;
  primaryLinkLabel?: string;
};

export const isMaketLinkEmpty = (value: MaketLinkValue | null | undefined): boolean =>
  !value?.primaryLinkUrl?.trim();

export const getDefaultRestorationMaket = (): StandardRestorationMaket => {
  const found = STANDARD_RESTORATION_MAKETS.find((maket) => maket.isDefault);
  return found ?? STANDARD_RESTORATION_MAKETS[0]!;
};

export const toSsylkaNaMakety = (
  maket: StandardRestorationMaket,
): { primaryLinkUrl: string; primaryLinkLabel: string } => ({
  primaryLinkUrl: maket.url,
  primaryLinkLabel: maket.label,
});
