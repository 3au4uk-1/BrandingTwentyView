import { describe, expect, it, vi } from 'vitest';

import {
  buildOpportunityDateFilter,
  getLocalDayBounds,
  getPresetRange,
  resolveDealBoardDateRange,
  shouldFetchAllOpportunities,
  toInputDate,
} from './date-filters';

describe('getPresetRange', () => {
  it('returns the same day for today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 27, 12, 0, 0));

    expect(getPresetRange('today')).toEqual({
      dateFrom: '2026-06-27',
      dateTo: '2026-06-27',
    });

    vi.useRealTimers();
  });

  it('returns the next day for tomorrow', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 27, 12, 0, 0));

    expect(getPresetRange('tomorrow')).toEqual({
      dateFrom: '2026-06-28',
      dateTo: '2026-06-28',
    });

    vi.useRealTimers();
  });
});

describe('getLocalDayBounds', () => {
  it('uses local midnight boundaries as ISO datetimes', () => {
    const bounds = getLocalDayBounds('2026-06-27');

    expect(bounds.gte).toBe(new Date(2026, 5, 27, 0, 0, 0, 0).toISOString());
    expect(bounds.lt).toBe(new Date(2026, 5, 28, 0, 0, 0, 0).toISOString());
  });
});

describe('buildOpportunityDateFilter', () => {
  it('builds a future filter from the start of tomorrow in local time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 27, 12, 0, 0));

    expect(buildOpportunityDateFilter({ datePreset: 'future' })).toEqual({
      loadDate: { gte: getLocalDayBounds('2026-06-28').gte },
    });

    vi.useRealTimers();
  });

  it('matches loadDate and closeDate fallback for a single day', () => {
    const bounds = getLocalDayBounds('2026-06-27');

    expect(
      buildOpportunityDateFilter({
        dateFrom: '2026-06-27',
        dateTo: '2026-06-27',
      }),
    ).toEqual({
      or: [
        {
          and: [{ loadDate: { gte: bounds.gte } }, { loadDate: { lt: bounds.lt } }],
        },
        {
          and: [
            { loadDate: { is: 'NULL' } },
            {
              and: [{ closeDate: { gte: bounds.gte } }, { closeDate: { lt: bounds.lt } }],
            },
          ],
        },
      ],
    });
  });

  it('builds an inclusive range for week and month presets', () => {
    expect(
      buildOpportunityDateFilter({
        dateFrom: '2026-06-23',
        dateTo: '2026-06-29',
      }),
    ).toEqual({
      or: [
        {
          and: [
            { loadDate: { gte: getLocalDayBounds('2026-06-23').gte } },
            { loadDate: { lt: getLocalDayBounds('2026-06-29').lt } },
          ],
        },
        {
          and: [
            { loadDate: { is: 'NULL' } },
            {
              and: [
                { closeDate: { gte: getLocalDayBounds('2026-06-23').gte } },
                { closeDate: { lt: getLocalDayBounds('2026-06-29').lt } },
              ],
            },
          ],
        },
      ],
    });
  });
});

describe('resolveDealBoardDateRange', () => {
  it('resolves stored presets dynamically', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 27, 12, 0, 0));

    expect(resolveDealBoardDateRange({ datePreset: 'today' })).toEqual({
      dateFrom: '2026-06-27',
      dateTo: '2026-06-27',
    });

    vi.useRealTimers();
  });
});

describe('shouldFetchAllOpportunities', () => {
  it('loads all records for single-day presets', () => {
    expect(shouldFetchAllOpportunities({ datePreset: 'today' })).toBe(true);
    expect(shouldFetchAllOpportunities({ datePreset: 'tomorrow' })).toBe(true);
    expect(
      shouldFetchAllOpportunities({
        dateFrom: '2026-06-27',
        dateTo: '2026-06-27',
      }),
    ).toBe(true);
    expect(shouldFetchAllOpportunities({ datePreset: 'week' })).toBe(false);
  });
});

describe('toInputDate', () => {
  it('formats local calendar dates', () => {
    expect(toInputDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
