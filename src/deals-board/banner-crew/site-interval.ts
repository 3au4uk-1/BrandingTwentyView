import { isoToMskParts, mskPartsToIso, validateLocationTimes } from './msk-datetime';
import { isOccupyingSlot } from './occupancy';
import type { BannerCrewSlot } from './types';

export type SiteIntervalDraft = {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
};

export const emptySiteInterval = (fallbackDate: string): SiteIntervalDraft => ({
  startDate: fallbackDate,
  startTime: '',
  endDate: fallbackDate,
  endTime: '',
});

export const parseClockInput = (raw: string): string | null => {
  const match = raw.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour > 23 || minute > 59) return null;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

export const siteDraftToIso = (
  draft: SiteIntervalDraft,
): { startsAt: string | null; endsAt: string | null } => {
  const startTime = parseClockInput(draft.startTime);
  const endTime = parseClockInput(draft.endTime);
  const startsAt =
    draft.startDate && startTime ? mskPartsToIso(draft.startDate, startTime) : null;
  const endsAt = draft.endDate && endTime ? mskPartsToIso(draft.endDate, endTime) : null;
  return { startsAt, endsAt };
};

export const siteIntervalError = (draft: SiteIntervalDraft): string | null => {
  if (draft.startTime.trim() && !parseClockInput(draft.startTime)) {
    return 'время начала в формате ЧЧ:ММ';
  }
  if (draft.endTime.trim() && !parseClockInput(draft.endTime)) {
    return 'время конца в формате ЧЧ:ММ';
  }

  const { startsAt, endsAt } = siteDraftToIso(draft);
  if (startsAt === null && endsAt === null) {
    if (!draft.startTime.trim() && !draft.endTime.trim()) return null;
    return 'укажи дату';
  }

  const status = validateLocationTimes(startsAt, endsAt);
  if (status === 'incomplete') return 'укажи начало и конец';
  if (status === 'invalid') return 'конец должен быть позже начала';
  return null;
};

export const siteDraftFromSlots = (
  slots: BannerCrewSlot[],
  fallbackDate: string,
): SiteIntervalDraft => {
  const siteSlots = slots.filter((slot) => slot.location === 'SITE');
  const source = siteSlots.find(isOccupyingSlot) ?? siteSlots[0];
  if (!source) return emptySiteInterval(fallbackDate);
  const start = source.startsAt ? isoToMskParts(source.startsAt) : null;
  const end = source.endsAt ? isoToMskParts(source.endsAt) : null;
  return {
    startDate: start?.date ?? end?.date ?? fallbackDate,
    startTime: start?.time ?? '',
    endDate: end?.date ?? start?.date ?? fallbackDate,
    endTime: end?.time ?? '',
  };
};
