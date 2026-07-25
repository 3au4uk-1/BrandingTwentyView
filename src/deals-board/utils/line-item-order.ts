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

/** Top → bottom bands after manual stage change. Unknown stages sit in the mid band. */
const STAGE_BAND_RANK: Readonly<Record<string, number>> = {
  NOVYY: 0,
  V_PECHATI: 1,
  OKLEYKA: 2,
  V_RABOTE: 3,
  GOTOVO: 4,
  OTMENA: 5,
};

const MID_BAND_FALLBACK = 2.5;

export const stageBandRank = (stage: string | null | undefined): number => {
  if (!stage) return MID_BAND_FALLBACK;
  return STAGE_BAND_RANK[stage] ?? MID_BAND_FALLBACK;
};

/** Stable within-band: keep prior poryadok / encounter order. */
export const sortLineItemsByStageBands = (items: LineItemRow[]): LineItemRow[] => {
  const decorated = items.map((item, index) => ({ item, index }));
  decorated.sort((left, right) => {
    const rankDiff = stageBandRank(left.item.stage) - stageBandRank(right.item.stage);
    if (rankDiff !== 0) return rankDiff;

    const leftOrder =
      typeof left.item.poryadok === 'number' && Number.isFinite(left.item.poryadok)
        ? left.item.poryadok
        : left.index;
    const rightOrder =
      typeof right.item.poryadok === 'number' && Number.isFinite(right.item.poryadok)
        ? right.item.poryadok
        : right.index;
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    return left.index - right.index;
  });
  return decorated.map((entry) => entry.item);
};

/**
 * Project `changedId` to `nextStage`, sort by stage bands, return poryadok patches.
 * Call only after a successful manual stage change (not ▲▼ reorder).
 */
export const planStageBandPoryadokPatches = (
  siblings: LineItemRow[],
  changedId: string,
  nextStage: string,
): PoryadokPatch[] => {
  const projected = siblings.map((item) =>
    item.id === changedId ? { ...item, stage: nextStage } : item,
  );
  const ordered = sortLineItemsByStageBands(projected);
  const byId = new Map(projected.map((item) => [item.id, item]));
  return planPoryadokPatches(
    ordered.map((item) => item.id),
    byId,
  );
};
