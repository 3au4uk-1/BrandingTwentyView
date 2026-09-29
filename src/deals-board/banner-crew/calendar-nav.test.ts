import { describe, expect, it } from 'vitest';
import {
  buildMonthGrid,
  ganttMonday,
  shiftCalendarView,
  toggleCalendarMode,
  viewForToday,
  visibleWeekDays,
} from './calendar-nav';

describe('calendar nav', () => {
  it('shows the Monday–Sunday week that contains the anchor', () => {
    expect(visibleWeekDays('2026-09-09')).toEqual([
      '2026-09-07',
      '2026-09-08',
      '2026-09-09',
      '2026-09-10',
      '2026-09-11',
      '2026-09-12',
      '2026-09-13',
    ]);
  });

  it('keeps the anchor when switching period and moves a week or a clamped month', () => {
    const week = viewForToday('week', '2026-09-09');
    expect(toggleCalendarMode(week)).toEqual({ mode: 'month', anchorDate: '2026-09-09' });
    expect(shiftCalendarView(week, 1).anchorDate).toBe('2026-09-16');
    expect(shiftCalendarView({ mode: 'month', anchorDate: '2026-01-31' }, 1).anchorDate).toBe(
      '2026-02-28',
    );
  });

  it('pads September 2026 so the grid starts on Monday', () => {
    const grid = buildMonthGrid('2026-09-09');
    expect(grid.cells[0]).toEqual({ date: '2026-08-31', inMonth: false });
    expect(grid.cells[1]).toEqual({ date: '2026-09-01', inMonth: true });
    expect(grid.cells.at(-1)?.inMonth).toBe(false);
    expect(grid.cells.length % 7).toBe(0);
  });

  it('opens the gantt on the shown week, or the fallback week when the month has no anchor', () => {
    expect(ganttMonday({ mode: 'week', anchorDate: '2026-09-09' }, '2026-09-01')).toBe('2026-09-07');
    expect(ganttMonday({ mode: 'month', anchorDate: '2026-09-18' }, '2026-09-01')).toBe('2026-09-14');
    expect(ganttMonday({ mode: 'month', anchorDate: null }, '2026-09-09', { year: 2026, month: 9 })).toBe(
      '2026-09-07',
    );
    expect(ganttMonday({ mode: 'month', anchorDate: null }, '2026-10-02', { year: 2026, month: 9 })).toBe(
      '2026-08-31',
    );
  });
});
