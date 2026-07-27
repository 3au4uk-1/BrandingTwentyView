export type DealPrefix = 'PRO' | 'ARENDA' | 'ART' | 'BIRZHA' | 'BS' | 'OTHER';

export const DEAL_PREFIX_ORDER: DealPrefix[] = ['PRO', 'ARENDA', 'ART', 'BIRZHA', 'BS'];

export const DEAL_PREFIX_LABELS: Record<Exclude<DealPrefix, 'OTHER'>, string> = {
  PRO: 'ПРО',
  ARENDA: 'Аренда',
  ART: 'АРТ',
  BIRZHA: 'Биржа',
  BS: 'БС',
};

/** Parse opportunity name prefix used for ops summary (ПРО/Аренда/АРТ/Биржа/БС). */
export const parseDealPrefix = (name: string | null | undefined): DealPrefix => {
  const n = (name || '').trim();
  if (n.startsWith('ПРО/') || n.startsWith('ПРО ')) return 'PRO';
  if (n.startsWith('АРЕНДА/') || n.startsWith('АРЕНДА ') || n.startsWith('Аренда/')) return 'ARENDA';
  if (n.startsWith('АРТ/') || n.startsWith('АРТ ')) return 'ART';
  if (n.startsWith('Биржа') || n.startsWith('БИРЖА')) return 'BIRZHA';
  if (n.startsWith('БС/') || n.startsWith('БС ') || n.startsWith('БС')) return 'BS';
  return 'OTHER';
};

export const countDealsByPrefix = (
  deals: Array<{ id: string; name?: string | null }>,
): Record<DealPrefix, number> => {
  const counts: Record<DealPrefix, number> = {
    PRO: 0,
    ARENDA: 0,
    ART: 0,
    BIRZHA: 0,
    BS: 0,
    OTHER: 0,
  };
  const seen = new Set<string>();

  for (const deal of deals) {
    if (!deal.id || seen.has(deal.id)) continue;
    seen.add(deal.id);
    counts[parseDealPrefix(deal.name)] += 1;
  }

  return counts;
};
