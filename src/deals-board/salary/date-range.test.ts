import { describe, expect, it, vi } from 'vitest';

import {
  clampSplitDay,
  entryHalf,
  formatPeriodLabel,
  getCurrentMonthMode,
  halfPeriod,
  inferSplitDayFromEntries,
  periodKey,
  readStoredSplitDay,
  resolveOkleykaDateRange,
  salaryPeriodsForMode,
  storeSplitDay,
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

describe('split day memory', () => {
  it('assigns entries to halves by period start day', () => {
    expect(entryHalf('2026-07-01')).toBe('first');
    expect(entryHalf('2026-07-16')).toBe('second');
    expect(entryHalf('2026-07-18')).toBe('second');
  });

  it('infers split day from saved entries', () => {
    expect(
      inferSplitDayFromEntries([{ periodStart: '2026-07-01', periodEnd: '2026-07-16' }]),
    ).toBe(16);
    expect(
      inferSplitDayFromEntries([{ periodStart: '2026-07-18', periodEnd: '2026-07-31' }]),
    ).toBe(17);
    expect(inferSplitDayFromEntries([])).toBeNull();
    expect(
      inferSplitDayFromEntries([{ periodStart: '2026-07-01', periodEnd: '2026-07-31' }]),
    ).toBeNull();
  });

  it('stores and reads split day per month via localStorage', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    });
    try {
      expect(readStoredSplitDay(2026, 6)).toBeNull();
      storeSplitDay(2026, 6, 16);
      expect(readStoredSplitDay(2026, 6)).toBe(16);
      expect(readStoredSplitDay(2026, 7)).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
