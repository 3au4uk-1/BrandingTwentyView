import { BANNER_CREW_LOCATION_LABEL } from 'src/constants/banner-crew';
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

const BASE_CHIP_WORD =
  BANNER_CREW_LOCATION_LABEL.BASE === 'на базе' ? 'база' : BANNER_CREW_LOCATION_LABEL.BASE;

const formatOccupyingPart = (slot: BannerCrewSlot): string | null => {
  const range = formatSlotTimeRange(slot);
  if (!range) return null;
  if (slot.location === 'BASE') return `${BASE_CHIP_WORD} ${range}`;
  return range;
};

const formatOccupyingChipText = (occupying: BannerCrewSlot[]): string => {
  const groups = new Map<string, { site?: BannerCrewSlot; base?: BannerCrewSlot }>();
  const order: string[] = [];
  for (const slot of occupying) {
    const name = slot.supplierName ?? '';
    let group = groups.get(name);
    if (!group) {
      group = {};
      groups.set(name, group);
      order.push(name);
    }
    if (slot.location === 'SITE') group.site = slot;
    else group.base = slot;
  }

  return order
    .map((name) => {
      const group = groups.get(name)!;
      const chunks = [name];
      const sitePart = group.site ? formatOccupyingPart(group.site) : null;
      const basePart = group.base ? formatOccupyingPart(group.base) : null;
      if (sitePart) chunks.push(sitePart);
      if (basePart) chunks.push(basePart);
      return chunks.join(' ');
    })
    .join(' · ');
};

export const buildBannerCrewChipModel = (args: {
  lineItems: Array<{ tip?: string | null }>;
  slots: BannerCrewSlot[];
  allSlotsForConflicts: BannerCrewSlot[];
}): BannerCrewChipModel | null => {
  if (!dealHasBannerLineItem(args.lineItems)) return null;

  if (args.slots.length === 0) {
    return { visible: true, text: 'Баннерщики', color: 'gray' };
  }

  const occupying = args.slots.filter(isOccupyingSlot);
  if (occupying.length === 0) {
    const names = uniqueSupplierNames(args.slots);
    return {
      visible: true,
      text: `${names.join(' · ')} · без времени`,
      color: 'gray',
    };
  }

  const conflicts = findConflicts(args.allSlotsForConflicts);
  const hasConflict = occupying.some((slot) => conflicts.has(slot.id));
  return {
    visible: true,
    text: formatOccupyingChipText(occupying),
    color: hasConflict ? 'yellow' : 'green',
  };
};
