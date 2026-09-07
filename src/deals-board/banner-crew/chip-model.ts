import { findConflicts, isOccupyingSlot } from './occupancy';
import type { BannerCrewSlot } from './types';

const MSK_CLOCK = new Intl.DateTimeFormat('ru-RU', {
  timeZone: 'Europe/Moscow',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export type BannerCrewChipModel = {
  visible: boolean;
  text: string;
  color: 'gray' | 'green' | 'yellow';
};

export const dealHasBannerLineItem = (items: Array<{ tip?: string | null }>): boolean =>
  items.some((item) => item.tip === 'BANNERA');

const formatMskClock = (iso: string): string => {
  const parts = MSK_CLOCK.formatToParts(new Date(iso));
  const hour = parts.find((part) => part.type === 'hour')?.value ?? '';
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '';
  return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
};

export const formatSlotTimeRange = (slot: BannerCrewSlot): string | null => {
  if (!isOccupyingSlot(slot) || !slot.startsAt || !slot.endsAt) return null;
  return `${formatMskClock(slot.startsAt)}–${formatMskClock(slot.endsAt)}`;
};

const uniqueSupplierNames = (slots: BannerCrewSlot[]): string[] => {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const slot of slots) {
    const name = slot.supplierName?.trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    names.push(name);
  }
  return names;
};

export const formatOccupyingChipText = (occupying: BannerCrewSlot[]): string => {
  const site = occupying.filter((slot) => slot.location === 'SITE');
  const names = uniqueSupplierNames(site);
  const range = site[0] ? formatSlotTimeRange(site[0]) : null;
  if (range) return [range, ...names].join(' · ');
  return names.join(' · ');
};

export const buildBannerCrewChipModel = (args: {
  lineItems: Array<{ tip?: string | null }>;
  slots: BannerCrewSlot[];
  allSlotsForConflicts: BannerCrewSlot[];
}): BannerCrewChipModel | null => {
  if (!dealHasBannerLineItem(args.lineItems)) return null;

  const siteSlots = args.slots.filter((slot) => slot.location === 'SITE');
  if (siteSlots.length === 0) {
    return { visible: true, text: 'Баннерщики', color: 'gray' };
  }

  const occupying = siteSlots.filter(isOccupyingSlot);
  if (occupying.length === 0) {
    const names = uniqueSupplierNames(siteSlots);
    return {
      visible: true,
      text: `${names.join(' · ')} · без времени`,
      color: 'gray',
    };
  }

  const conflictSlots = args.allSlotsForConflicts.filter(
    (slot) => slot.location === 'SITE' && isOccupyingSlot(slot),
  );
  const conflicts = findConflicts(conflictSlots);
  const hasConflict = occupying.some((slot) => conflicts.has(slot.id));
  return {
    visible: true,
    text: formatOccupyingChipText(occupying),
    color: hasConflict ? 'yellow' : 'green',
  };
};
