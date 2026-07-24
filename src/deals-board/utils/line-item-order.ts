import type { LineItemRow } from '../types';

export const compareLineItemOrder = (a: LineItemRow, b: LineItemRow): number => {
  const aOrder =
    typeof a.poryadok === 'number' && Number.isFinite(a.poryadok)
      ? a.poryadok
      : Number.POSITIVE_INFINITY;
  const bOrder =
    typeof b.poryadok === 'number' && Number.isFinite(b.poryadok)
      ? b.poryadok
      : Number.POSITIVE_INFINITY;
  if (aOrder !== bOrder) return aOrder - bOrder;
  return a.id.localeCompare(b.id);
};

export const sortLineItemsByOrder = (items: LineItemRow[]): LineItemRow[] =>
  [...items].sort(compareLineItemOrder);

export const nextPoryadok = (siblings: LineItemRow[]): number => {
  let max = -1;
  for (const item of siblings) {
    if (typeof item.poryadok === 'number' && Number.isFinite(item.poryadok)) {
      max = Math.max(max, item.poryadok);
    }
  }
  return max + 1;
};

export type PoryadokPatch = { id: string; data: { poryadok: number } };

/** After drag: orderedIds is the new visual order within one deal. */
export const planPoryadokPatches = (
  orderedIds: string[],
  itemsById: Map<string, LineItemRow>,
): PoryadokPatch[] => {
  const patches: PoryadokPatch[] = [];
  orderedIds.forEach((id, index) => {
    const current = itemsById.get(id);
    if (!current) return;
    if (current.poryadok === index) return;
    patches.push({ id, data: { poryadok: index } });
  });
  return patches;
};

export const moveItemInOrder = (
  orderedIds: string[],
  fromId: string,
  toId: string,
): string[] | null => {
  if (fromId === toId) return null;
  const fromIndex = orderedIds.indexOf(fromId);
  const toIndex = orderedIds.indexOf(toId);
  if (fromIndex < 0 || toIndex < 0) return null;
  const next = [...orderedIds];
  next.splice(fromIndex, 1);
  next.splice(toIndex, 0, fromId);
  return next;
};
