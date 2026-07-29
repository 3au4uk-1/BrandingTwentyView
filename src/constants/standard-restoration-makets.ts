export type RestorationMaketCatalogEntry = {
  id: string;
  label: string;
  url: string;
  matchKeywords?: string;
  priority?: number;
  isDefault?: boolean;
  isActive?: boolean;
};

/** @deprecated Use RestorationMaketCatalogEntry */
export type StandardRestorationMaket = RestorationMaketCatalogEntry;

/**
 * Demo catalog — replace URLs with real Cloud/Drive links when ready.
 * Kept in code (wave 4 decision A) so the board works without a CRM directory object.
 */
export const STANDARD_RESTORATION_MAKETS: RestorationMaketCatalogEntry[] = [
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

export const parseMatchKeywords = (raw: string | null | undefined): string[] => {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,;]+/)
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
};

export const scoreTemplateAgainstName = (
  entry: RestorationMaketCatalogEntry,
  lineItemName: string,
): number => {
  const name = lineItemName.toLowerCase();
  const keywords = parseMatchKeywords(entry.matchKeywords);
  return keywords.filter((keyword) => name.includes(keyword)).length;
};

export const pickRestorationMaket = (
  catalog: RestorationMaketCatalogEntry[],
  lineItemName?: string | null,
): RestorationMaketCatalogEntry | null => {
  const active = catalog.filter((entry) => entry.isActive !== false);

  if (lineItemName?.trim()) {
    const scored = active
      .map((entry) => ({
        entry,
        score: scoreTemplateAgainstName(entry, lineItemName),
      }))
      .filter(({ score }) => score > 0);

    if (scored.length > 0) {
      scored.sort((a, b) => {
        const priorityDiff = (b.entry.priority ?? 0) - (a.entry.priority ?? 0);
        if (priorityDiff !== 0) return priorityDiff;
        const scoreDiff = b.score - a.score;
        if (scoreDiff !== 0) return scoreDiff;
        return a.entry.label.localeCompare(b.entry.label);
      });
      return scored[0]!.entry;
    }
  }

  return active.find((entry) => entry.isDefault === true) ?? null;
};

export const getDefaultRestorationMaket = (): RestorationMaketCatalogEntry => {
  const found = STANDARD_RESTORATION_MAKETS.find((maket) => maket.isDefault);
  return found ?? STANDARD_RESTORATION_MAKETS[0]!;
};

export const toSsylkaNaMakety = (
  maket: RestorationMaketCatalogEntry,
): { primaryLinkUrl: string; primaryLinkLabel: string } => ({
  primaryLinkUrl: maket.url,
  primaryLinkLabel: maket.label,
});
