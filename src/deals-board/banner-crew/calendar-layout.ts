import { isoToMskParts } from './msk-datetime';

export type BannerDealSlot = {
  supplierId: string | null;
  supplierName: string | null;
  startsAt: string | null;
  endsAt: string | null;
};

export type BannerDealInput = {
  id: string;
  name: string;
  stage: string | null;
  address: string;
  loadDate: string | null;
  positionNames: string[];
  slots: BannerDealSlot[];
};

export type BannerDayCard = {
  dealId: string;
  name: string;
  date: string;
  timeLabel: string;
  address: string;
  assignees: string[];
  positionNames: string[];
  closed: boolean;
};

export type BannerCalendarModel = {
  cardsByDate: Record<string, BannerDayCard[]>;
  undated: BannerDayCard[];
};

type DatedSlot = {
  name: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
};

type DayMark =
  | { kind: 'all-day' }
  | { kind: 'range'; start: string | null; end: string | null };

type DayBucket = {
  names: Set<string>;
  marks: DayMark[];
};

const byRu = (left: string, right: string): number => left.localeCompare(right, 'ru');

const addDays = (date: string, days: number): string => {
  const [year, month, day] = date.split('-').map(Number);
  const next = new Date(Date.UTC(year, (month ?? 1) - 1, (day ?? 1) + days));
  const y = String(next.getUTCFullYear()).padStart(4, '0');
  const m = String(next.getUTCMonth() + 1).padStart(2, '0');
  const d = String(next.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const datesInclusive = (start: string, end: string): string[] => {
  const dates: string[] = [];
  let cursor = start;
  while (cursor <= end) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return dates;
};

const assigneeName = (slot: BannerDealSlot): string | null => {
  const name = slot.supplierName?.trim();
  return slot.supplierId && name ? name : null;
};

const datedSlot = (slot: BannerDealSlot): DatedSlot | null => {
  const name = assigneeName(slot);
  if (!name || !slot.startsAt || !slot.endsAt) return null;
  const startMs = Date.parse(slot.startsAt);
  const endMs = Date.parse(slot.endsAt);
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || startMs >= endMs) return null;
  const start = isoToMskParts(slot.startsAt);
  const end = isoToMskParts(slot.endsAt);
  if (!start || !end || start.date > end.date) return null;
  return {
    name,
    startDate: start.date,
    endDate: end.date,
    startTime: start.time,
    endTime: end.time,
  };
};

const loadParts = (loadDate: string | null): { date: string; time: string } | null => {
  if (!loadDate) return null;
  return isoToMskParts(loadDate);
};

const timeLabel = (marks: DayMark[], fallback: string): string => {
  if (marks.some((mark) => mark.kind === 'all-day')) return 'весь день';

  let earliestStart: string | null = null;
  let latestEnd: string | null = null;
  let hasFirstDay = false;
  let hasLastDay = false;

  for (const mark of marks) {
    if (mark.kind !== 'range') continue;
    const isFirstDay = mark.start != null && mark.end == null;
    const isLastDay = mark.end != null && mark.start == null;
    if (isFirstDay) hasFirstDay = true;
    if (isLastDay) hasLastDay = true;
    if (mark.start && (!earliestStart || mark.start < earliestStart)) {
      earliestStart = mark.start;
    }
    if (mark.end && (!latestEnd || mark.end > latestEnd)) {
      latestEnd = mark.end;
    }
  }

  if (hasFirstDay && hasLastDay) return 'весь день';
  if (hasFirstDay && earliestStart) return `с ${earliestStart}`;
  if (hasLastDay && latestEnd) return `до ${latestEnd}`;
  if (earliestStart && latestEnd) return `${earliestStart}–${latestEnd}`;
  if (earliestStart) return `с ${earliestStart}`;
  if (latestEnd) return `до ${latestEnd}`;
  return fallback;
};

const cardFrom = (
  deal: BannerDealInput,
  date: string,
  names: Set<string>,
  time: string,
): BannerDayCard => {
  const assignees = [...names].sort(byRu);
  return {
    dealId: deal.id,
    name: deal.name,
    date,
    timeLabel: time,
    address: deal.address,
    assignees,
    positionNames: deal.positionNames,
    closed: assignees.length > 0,
  };
};

const placeDeal = (deal: BannerDealInput): { dated: BannerDayCard[]; undated: BannerDayCard | null } => {
  const buckets = new Map<string, DayBucket>();
  const undatedNames = new Set<string>();

  for (const slot of deal.slots) {
    const dated = datedSlot(slot);
    if (!dated) {
      const name = assigneeName(slot);
      if (name) undatedNames.add(name);
      continue;
    }
    const days = datesInclusive(dated.startDate, dated.endDate);
    days.forEach((date, index) => {
      const bucket = buckets.get(date) ?? { names: new Set<string>(), marks: [] };
      bucket.names.add(dated.name);
      const last = index === days.length - 1;
      if (days.length === 1) {
        bucket.marks.push({ kind: 'range', start: dated.startTime, end: dated.endTime });
      } else if (index === 0) {
        bucket.marks.push({ kind: 'range', start: dated.startTime, end: null });
      } else if (last) {
        bucket.marks.push({ kind: 'range', start: null, end: dated.endTime });
      } else {
        bucket.marks.push({ kind: 'all-day' });
      }
      buckets.set(date, bucket);
    });
  }

  const loaded = loadParts(deal.loadDate);
  if (undatedNames.size > 0 && loaded && buckets.has(loaded.date)) {
    const bucket = buckets.get(loaded.date);
    if (bucket) {
      for (const name of undatedNames) bucket.names.add(name);
    }
    undatedNames.clear();
  }

  const dated = [...buckets.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, bucket]) => cardFrom(deal, date, bucket.names, timeLabel(bucket.marks, '')));

  if (buckets.size === 0 && loaded) {
    return {
      dated: [cardFrom(deal, loaded.date, undatedNames, loaded.time)],
      undated: null,
    };
  }

  if (buckets.size === 0) {
    return { dated: [], undated: cardFrom(deal, '', undatedNames, '') };
  }

  if (undatedNames.size > 0 && loaded && !buckets.has(loaded.date)) {
    dated.push(cardFrom(deal, loaded.date, undatedNames, loaded.time));
    dated.sort((left, right) => left.date.localeCompare(right.date));
    return { dated, undated: null };
  }

  if (undatedNames.size > 0) {
    return { dated, undated: cardFrom(deal, '', undatedNames, '') };
  }

  return { dated, undated: null };
};

export const buildBannerCalendar = (deals: BannerDealInput[]): BannerCalendarModel => {
  const cardsByDate: Record<string, BannerDayCard[]> = {};
  const undated: BannerDayCard[] = [];

  for (const deal of deals) {
    if (deal.stage === 'OTMENA') continue;
    const placed = placeDeal(deal);
    for (const card of placed.dated) {
      const list = cardsByDate[card.date] ?? [];
      list.push(card);
      cardsByDate[card.date] = list;
    }
    if (placed.undated) undated.push(placed.undated);
  }

  for (const date of Object.keys(cardsByDate)) {
    cardsByDate[date]?.sort((left, right) => byRu(left.name, right.name));
  }
  undated.sort((left, right) => byRu(left.name, right.name));
  return { cardsByDate, undated };
};
