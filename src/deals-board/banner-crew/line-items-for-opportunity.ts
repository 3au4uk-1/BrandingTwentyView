type LineItemLike = {
  id?: string;
  opportunityId?: string | null;
  tip?: string | null;
};

const appendUniqueById = <T extends LineItemLike>(target: T[], seenIds: Set<string>, item: T) => {
  if (typeof item.id === 'string' && item.id) {
    if (seenIds.has(item.id)) return;
    seenIds.add(item.id);
  }
  target.push(item);
};

export const lineItemsForOpportunity = <T extends LineItemLike>(
  cacheLists: Array<T[] | undefined | null>,
  opportunityId: string,
  fallback: T[],
): T[] => {
  const fromCache = cacheLists
    .flatMap((list) => list ?? [])
    .filter((item) => item.opportunityId === opportunityId);

  if (fromCache.length === 0) return fallback;

  const seenIds = new Set<string>();
  const union: T[] = [];
  for (const item of fallback) {
    appendUniqueById(union, seenIds, item);
  }
  for (const item of fromCache) {
    appendUniqueById(union, seenIds, item);
  }
  return union;
};
