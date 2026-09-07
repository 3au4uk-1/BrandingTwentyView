type LineItemLike = {
  opportunityId?: string | null;
  tip?: string | null;
};

export const lineItemsForOpportunity = <T extends LineItemLike>(
  cacheLists: Array<T[] | undefined | null>,
  opportunityId: string,
  fallback: T[],
): T[] => {
  const flattened = cacheLists.flatMap((list) => list ?? []);
  if (flattened.length === 0) return fallback;
  return flattened.filter((item) => item.opportunityId === opportunityId);
};
