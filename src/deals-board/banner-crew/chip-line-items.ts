export const uniqueOpportunityIds = (...idLists: Array<Iterable<string>>): string[] => {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const list of idLists) {
    for (const id of list) {
      if (!id || seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
};

export const groupLineItemsByOpportunityId = <T extends { opportunityId: string }>(
  items: T[],
): Record<string, T[]> => {
  const grouped: Record<string, T[]> = {};
  for (const item of items) {
    (grouped[item.opportunityId] ??= []).push(item);
  }
  return grouped;
};

export const flattenChipLineItemsForDeals = <T>(
  dealIds: string[],
  unfilteredByOppId: Record<string, T[] | undefined>,
  fallbackByOppId: Record<string, T[] | undefined>,
): T[] => {
  const lists: T[] = [];
  for (const id of dealIds) {
    lists.push(...(unfilteredByOppId[id] ?? fallbackByOppId[id] ?? []));
  }
  return lists;
};
