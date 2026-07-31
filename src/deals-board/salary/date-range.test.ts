import { describe, expect, it } from 'vitest';

import {
  clampSplitDay,
  formatPeriodLabel,
  getCurrentMonthMode,
  halfPeriod,
  periodKey,
  resolveOkleykaDateRange,
  salaryPeriodsForMode,
} from './date-range';

describe('okleyka date-range', () => {
  it('defaults to calendar month of now', () => {
    const mode = getCurrentMonthMode(new Date(2026, 6, 30));
    expect(mode).toEqual({ kind: 'month', year: 2026, monthIndex: 6 });
    expect(resolveOkleykaDateRange(mode, 15)).toEqual({
      dateFrom: '2026-07-01',
      dateTo: '2026-07-31',
    });
  });

  it('accepts custom range', () => {
    expect(
      resolveOkleykaDateRange({ kind: 'range', dateFrom: '2026-07-01', dateTo: '2026-07-15' }, 15),
    ).toEqual({ dateFrom: '2026-07-01', dateTo: '2026-07-15' });
  });

  it('rejects inverted range', () => {
    expect(
      resolveOkleykaDateRange({ kind: 'range', dateFrom: '2026-07-20', dateTo: '2026-07-01' }, 15),
    ).toEqual({ error: 'Укажите корректный диапазон дат' });
  });
});

describe('half periods', () => {
  it('builds first and second halves with splitDay', () => {
    expect(halfPeriod(2026, 6, 'first', 15)).toEqual({
      dateFrom: '2026-07-01',
      dateTo: '2026-07-15',
    });
    expect(halfPeriod(2026, 6, 'second', 15)).toEqual({
      dateFrom: '2026-07-16',
      dateTo: '2026-07-31',
    });
    expect(halfPeriod(2026, 6, 'second', 17)).toEqual({
      dateFrom: '2026-07-18',
      dateTo: '2026-07-31',
    });
    expect(halfPeriod(2026, 1, 'second', 15)).toEqual({
      dateFrom: '2026-02-16',
      dateTo: '2026-02-28',
    });
  });

  it('clamps split day', () => {
    expect(clampSplitDay(15)).toBe(15);
    expect(clampSplitDay(9)).toBe(10);
    expect(clampSplitDay(26)).toBe(25);
    expect(clampSplitDay(Number.NaN)).toBe(15);
  });

  it('resolves half mode', () => {
    expect(
      resolveOkleykaDateRange(
        { kind: 'half', year: 2026, monthIndex: 6, half: 'second' },
        16,
      ),
    ).toEqual({ dateFrom: '2026-07-17', dateTo: '2026-07-31' });
  });

  it('salaryPeriodsForMode: month → two halves, half → one, range → none', () => {
    expect(
      salaryPeriodsForMode({ kind: 'month', year: 2026, monthIndex: 6 }, 15),
    ).toEqual([
      { dateFrom: '2026-07-01', dateTo: '2026-07-15' },
      { dateFrom: '2026-07-16', dateTo: '2026-07-31' },
    ]);
    expect(
      salaryPeriodsForMode(
        { kind: 'half', year: 2026, monthIndex: 6, half: 'first' },
        15,
      ),
    ).toHaveLength(1);
    expect(
      salaryPeriodsForMode(
        { kind: 'range', dateFrom: '2026-07-01', dateTo: '2026-07-10' },
        15,
      ),
    ).toEqual([]);
  });

  it('periodKey and label', () => {
    expect(periodKey({ dateFrom: '2026-07-01', dateTo: '2026-07-15' })).toBe(
      '2026-07-01_2026-07-15',
    );
    expect(formatPeriodLabel({ dateFrom: '2026-07-16', dateTo: '2026-07-31' })).toBe(
      '16–31 июл',
    );
  });
});
