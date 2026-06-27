import { describe, expect, it, vi } from 'vitest';

import {
  buildOpportunityDateFilter,
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

describe('buildOpportunityDateFilter', () => {
  it('builds a future filter relative to today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 27, 12, 0, 0));

    expect(buildOpportunityDateFilter({ datePreset: 'future' })).toEqual({
      loadDate: { gt: '2026-06-27' },
    });

    vi.useRealTimers();
  });

  it('matches loadDate and closeDate fallback for a single day', () => {
    expect(
      buildOpportunityDateFilter({
        dateFrom: '2026-06-27',
        dateTo: '2026-06-27',
      }),
    ).toEqual({
      or: [
        {
          and: [{ loadDate: { gte: '2026-06-27' } }, { loadDate: { lte: '2026-06-27' } }],
        },
        {
          and: [
            { loadDate: { is: 'NULL' } },
            {
              and: [{ closeDate: { gte: '2026-06-27' } }, { closeDate: { lte: '2026-06-27' } }],
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
