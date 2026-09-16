import type { ChildSmetaRow, LineItemRow, OpportunityRow } from '../types';

export const groupSmetasForParent = (
  parentId: string,
  childRecords: OpportunityRow[],
  lineItems: LineItemRow[],
): ChildSmetaRow[] => {
  const itemsByOpportunityId = new Map<string, LineItemRow[]>();
  for (const item of lineItems) {
    const bucket = itemsByOpportunityId.get(item.opportunityId);
    if (bucket) {
      bucket.push(item);
    } else {
      itemsByOpportunityId.set(item.opportunityId, [item]);
    }
  }

  return childRecords
    .filter((child) => child.parentOpportunityId === parentId)
    .map((child) => ({
      ...child,
      lineItems: itemsByOpportunityId.get(child.id) ?? [],
    }));
};

export const attachChildSmetasToParents = (
  parents: OpportunityRow[],
  childRecords: OpportunityRow[],
  lineItems: LineItemRow[],
): OpportunityRow[] =>
  parents.map((parent) => {
    const childSmetas = groupSmetasForParent(parent.id, childRecords, lineItems);
    if (!childSmetas.length) return parent;
    return { ...parent, childSmetas };
  });
