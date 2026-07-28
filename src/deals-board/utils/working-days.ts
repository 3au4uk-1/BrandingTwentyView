import { toInputDate } from './date-filters';

const MSK_TZ = 'Europe/Moscow';

/** Calendar YYYY-MM-DD in Europe/Moscow for "today". */
export const getTodayInputDateMsk = (now: Date = new Date()): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: MSK_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  if (!year || !month || !day) return toInputDate(now);
  return `${year}-${month}-${day}`;
};

const parseDay = (inputDate: string): Date => {
  const [year, month, day] = inputDate.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

/**
 * Remaining working days until event (Mon–Fri).
 * Same day or past → 0. Does not count today; counts each weekday from tomorrow through event inclusive.
 */
export const workingDaysUntil = (todayInput: string, eventInput: string): number => {
  const today = parseDay(todayInput);
  const event = parseDay(eventInput);
  if (event.getTime() <= today.getTime()) return 0;

  let count = 0;
  const cursor = new Date(today);
  cursor.setDate(cursor.getDate() + 1);

  while (cursor.getTime() <= event.getTime()) {
    if (!isWeekend(cursor)) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }

  return count;
};
