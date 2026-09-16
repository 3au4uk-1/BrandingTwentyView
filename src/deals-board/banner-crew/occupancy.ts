import type { BannerCrewSlot } from './types';

export const isOccupyingSlot = (slot: BannerCrewSlot): boolean => {
  if (!slot.opportunityId || !slot.supplierId) return false;
  if (slot.opportunityStage === 'OTMENA') return false;
  if (!slot.startsAt || !slot.endsAt) return false;
  return Date.parse(slot.startsAt) < Date.parse(slot.endsAt);
};

export const intervalsOverlap = (
  a: { startsAt: string; endsAt: string },
  b: { startsAt: string; endsAt: string },
): boolean => Date.parse(a.startsAt) < Date.parse(b.endsAt) && Date.parse(b.startsAt) < Date.parse(a.endsAt);

export const findConflicts = (slots: BannerCrewSlot[]): Map<string, string[]> => {
  const occupying = slots.filter(isOccupyingSlot);
  const result = new Map<string, string[]>();
  for (let i = 0; i < occupying.length; i += 1) {
    for (let j = i + 1; j < occupying.length; j += 1) {
      const left = occupying[i]!;
      const right = occupying[j]!;
      if (left.supplierId !== right.supplierId) continue;
      if (!intervalsOverlap(
        { startsAt: left.startsAt!, endsAt: left.endsAt! },
        { startsAt: right.startsAt!, endsAt: right.endsAt! },
      )) continue;
      const add = (from: BannerCrewSlot, to: BannerCrewSlot) => {
        const list = result.get(from.id) ?? [];
        list.push(to.id);
        result.set(from.id, list);
      };
      add(left, right);
      add(right, left);
    }
  }
  return result;
};
