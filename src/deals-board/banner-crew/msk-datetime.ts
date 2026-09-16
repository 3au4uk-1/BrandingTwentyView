const MSK_TZ = 'Europe/Moscow';
const MSK_OFFSET = '+03:00';

export type MskWeekRange = {
  startIso: string;
  endIso: string;
  days: string[];
};

const partValue = (
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): string | undefined => parts.find((part) => part.type === type)?.value;

const mskDateTimeParts = (instant: Date): { date: string; time: string } | null => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: MSK_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);

  const year = partValue(parts, 'year');
  const month = partValue(parts, 'month');
  const day = partValue(parts, 'day');
  const hour = partValue(parts, 'hour');
  const minute = partValue(parts, 'minute');
  if (!year || !month || !day || hour === undefined || minute === undefined) return null;

  return {
    date: `${year}-${month}-${day}`,
    time: `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`,
  };
};

const addCalendarDays = (date: string, days: number): string => {
  const [year, month, day] = date.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  const y = String(next.getUTCFullYear()).padStart(4, '0');
  const m = String(next.getUTCMonth() + 1).padStart(2, '0');
  const d = String(next.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const mondayOf = (date: string): string => {
  const [year, month, day] = date.split('-').map(Number);
  const weekdaySun0 = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const fromMonday = weekdaySun0 === 0 ? 6 : weekdaySun0 - 1;
  return addCalendarDays(date, -fromMonday);
};

const weekFromMonday = (monday: string): MskWeekRange => {
  const days = Array.from({ length: 7 }, (_, index) => addCalendarDays(monday, index));
  return {
    startIso: mskPartsToIso(monday, '00:00'),
    endIso: mskPartsToIso(addCalendarDays(monday, 7), '00:00'),
    days,
  };
};

export const mskPartsToIso = (date: string, time: string): string => {
  const ms = Date.parse(`${date}T${time}:00${MSK_OFFSET}`);
  return new Date(ms).toISOString();
};

export const isoToMskParts = (iso: string): { date: string; time: string } | null => {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  return mskDateTimeParts(new Date(ms));
};

export const getMskWeekRange = (now: Date): MskWeekRange => {
  const parts = mskDateTimeParts(now);
  if (!parts) {
    throw new Error('Unable to format Moscow calendar date');
  }
  return weekFromMonday(mondayOf(parts.date));
};

export const shiftMskWeek = (range: { startIso: string }, weeks: number): MskWeekRange => {
  const parts = isoToMskParts(range.startIso);
  if (!parts) {
    throw new Error('Unable to shift Moscow week from startIso');
  }
  return weekFromMonday(addCalendarDays(parts.date, weeks * 7));
};

export const validateLocationTimes = (
  startsAt: string | null,
  endsAt: string | null,
): 'ok' | 'incomplete' | 'invalid' => {
  if (startsAt === null && endsAt === null) return 'ok';
  if (startsAt === null || endsAt === null) return 'incomplete';
  return Date.parse(startsAt) < Date.parse(endsAt) ? 'ok' : 'invalid';
};
