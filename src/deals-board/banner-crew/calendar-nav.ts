export type CalendarView = {
  mode: 'week' | 'month';
  anchorDate: string | null;
};

export type MonthCell = { date: string; inMonth: boolean };

const addDays = (date: string, days: number): string => {
  const [year, month, day] = date.split('-').map(Number);
  const next = new Date(Date.UTC(year, (month ?? 1) - 1, (day ?? 1) + days));
  const y = String(next.getUTCFullYear()).padStart(4, '0');
  const m = String(next.getUTCMonth() + 1).padStart(2, '0');
  const d = String(next.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const mondayOf = (date: string): string => {
  const [year, month, day] = date.split('-').map(Number);
  const weekdaySun0 = new Date(Date.UTC(year, (month ?? 1) - 1, day)).getUTCDay();
  const fromMonday = weekdaySun0 === 0 ? 6 : weekdaySun0 - 1;
  return addDays(date, -fromMonday);
};

const daysInMonth = (year: number, month: number): number =>
  new Date(Date.UTC(year, month, 0)).getUTCDate();

const addMonthsClamped = (date: string, delta: number): string => {
  const [year, month, day] = date.split('-').map(Number);
  const absolute = (year ?? 0) * 12 + ((month ?? 1) - 1) + delta;
  const nextYear = Math.floor(absolute / 12);
  const nextMonth = (absolute % 12) + 1;
  const clamped = Math.min(day ?? 1, daysInMonth(nextYear, nextMonth));
  return `${String(nextYear).padStart(4, '0')}-${String(nextMonth).padStart(2, '0')}-${String(clamped).padStart(2, '0')}`;
};

export const viewForToday = (mode: 'week' | 'month', today: string): CalendarView => ({
  mode,
  anchorDate: today,
});

export const toggleCalendarMode = (view: CalendarView): CalendarView => ({
  ...view,
  mode: view.mode === 'week' ? 'month' : 'week',
});

export const shiftCalendarView = (view: CalendarView, delta: number): CalendarView => {
  if (!view.anchorDate) return view;
  return {
    ...view,
    anchorDate:
      view.mode === 'week'
        ? addDays(view.anchorDate, delta * 7)
        : addMonthsClamped(view.anchorDate, delta),
  };
};

export const visibleWeekDays = (anchorDate: string): string[] => {
  const monday = mondayOf(anchorDate);
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
};

export const buildMonthGrid = (anchorDate: string): { year: number; month: number; cells: MonthCell[] } => {
  const [year, month] = anchorDate.split('-').map(Number);
  const first = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-01`;
  const start = mondayOf(first);
  const count = daysInMonth(year ?? 0, month ?? 1);
  const last = addDays(first, count - 1);
  const cells: MonthCell[] = [];
  let cursor = start;
  while (cells.length === 0 || cursor <= last || cells.length % 7 !== 0) {
    cells.push({ date: cursor, inMonth: cursor >= first && cursor <= last });
    cursor = addDays(cursor, 1);
    if (cells.length > 42) break;
  }
  return { year: year ?? 0, month: month ?? 1, cells };
};

const inShownMonth = (today: string, shown: { year: number; month: number }): boolean => {
  const [year, month] = today.split('-').map(Number);
  return year === shown.year && month === shown.month;
};

export const ganttMonday = (
  view: CalendarView,
  today: string,
  shownMonth?: { year: number; month: number },
): string => {
  if (view.mode === 'week' && view.anchorDate) return mondayOf(view.anchorDate);
  if (view.anchorDate) return mondayOf(view.anchorDate);
  if (shownMonth && inShownMonth(today, shownMonth)) return mondayOf(today);
  const month = shownMonth ?? { year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) };
  const first = `${String(month.year).padStart(4, '0')}-${String(month.month).padStart(2, '0')}-01`;
  return mondayOf(first);
};
