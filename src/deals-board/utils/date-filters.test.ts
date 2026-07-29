import { describe, expect, it, vi } from 'vitest';

import {
  buildOpportunityDateFilter,
  getLocalDayBounds,
  getPresetRange,
  hasLineItemFilterClauses,
  resolveDealBoardDateRange,
  shouldFetchAllOpportunities,
  toInputDate,
  toLocalInputDate,
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

  it('returns two days ahead for dayAfterTomorrow', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 27, 12, 0, 0));

    expect(getPresetRange('dayAfterTomorrow')).toEqual({
      dateFrom: '2026-06-29',
      dateTo: '2026-06-29',
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
      or: [
        { loadDate: { gte: getLocalDayBounds('2026-06-28').gte } },
        { closeDate: { gte: getLocalDayBounds('2026-06-28').gte } },
      ],
    });

    vi.useRealTimers();
  });

  it('matches loadDate or closeDate for a single day', () => {
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
          and: [{ closeDate: { gte: bounds.gte } }, { closeDate: { lt: bounds.lt } }],
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
            { closeDate: { gte: getLocalDayBounds('2026-06-23').gte } },
            { closeDate: { lt: getLocalDayBounds('2026-06-29').lt } },
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

describe('hasLineItemFilterClauses', () => {
  it('returns true when any line-item clause is present', () => {
    expect(
      hasLineItemFilterClauses([
        { id: '1', level: 'lineItem', field: 'stage', operator: 'in', value: ['NOVYY'] },
      ]),
    ).toBe(true);
    expect(
      hasLineItemFilterClauses([
        { id: '1', level: 'deal', field: 'companyId', operator: 'in', value: ['c1'] },
      ]),
    ).toBe(false);
  });
});

describe('shouldFetchAllOpportunities', () => {
  it('loads all records when line-item filter clauses are active', () => {
    expect(
      shouldFetchAllOpportunities(
        {},
        undefined,
        [{ id: '1', level: 'lineItem', field: 'stage', operator: 'in', value: ['NOVYY'] }],
      ),
    ).toBe(true);
    expect(
      shouldFetchAllOpportunities(
        {},
        undefined,
        [{ id: '1', level: 'deal', field: 'companyId', operator: 'in', value: ['c1'] }],
      ),
    ).toBe(false);
  });

  it('loads all records for today when line-item filter clauses are active', () => {
    expect(
      shouldFetchAllOpportunities(
        { datePreset: 'today' },
        undefined,
        [{ id: '1', level: 'lineItem', field: 'stage', operator: 'in', value: ['NOVYY'] }],
      ),
    ).toBe(true);
  });

  it('paginates tight date presets (even with default date sort)', () => {
    const dateSort = [{ field: 'loadDate', direction: 'AscNullsFirst' as const }];
    expect(shouldFetchAllOpportunities({ datePreset: 'today' }, dateSort)).toBe(false);
    expect(shouldFetchAllOpportunities({ datePreset: 'tomorrow' }, dateSort)).toBe(false);
    expect(shouldFetchAllOpportunities({ datePreset: 'dayAfterTomorrow' }, dateSort)).toBe(false);
    expect(shouldFetchAllOpportunities({ datePreset: 'week' }, dateSort)).toBe(false);
    expect(
      shouldFetchAllOpportunities(
        { datePreset: 'week' },
        [{ field: 'name', direction: 'AscNullsFirst' }],
      ),
    ).toBe(false);
  });

  it('loads all records for wide date filters except future (server-filtered page)', () => {
    expect(shouldFetchAllOpportunities({ datePreset: 'month' })).toBe(true);
    expect(shouldFetchAllOpportunities({ datePreset: 'future' })).toBe(false);
    expect(shouldFetchAllOpportunities({ datePreset: 'custom' })).toBe(true);
    expect(
      shouldFetchAllOpportunities({
        dateFrom: '2026-06-27',
        dateTo: '2026-06-27',
      }),
    ).toBe(true);
  });

  it('still fetchAll for future when line-item clauses exist', () => {
    expect(
      shouldFetchAllOpportunities(
        { datePreset: 'future' },
        undefined,
        [{ id: '1', level: 'lineItem', field: 'stage', operator: 'in', value: ['NOVYY'] }],
      ),
    ).toBe(true);
  });

  it('does not fetch-all when there is no date filter and no line-item clauses', () => {
    expect(shouldFetchAllOpportunities({})).toBe(false);
    expect(
      shouldFetchAllOpportunities(
        {},
        [{ field: 'loadDate', direction: 'AscNullsFirst' }],
      ),
    ).toBe(false);
  });
});

describe('toInputDate', () => {
  it('formats local calendar dates', () => {
    expect(toInputDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('toLocalInputDate', () => {
  it('returns plain YYYY-MM-DD values unchanged', () => {
    expect(toLocalInputDate('2026-07-03')).toBe('2026-07-03');
  });

  it('maps UTC datetime to the local calendar day', () => {
    const previousTz = process.env.TZ;
    process.env.TZ = 'Europe/Moscow';

    try {
      expect(toLocalInputDate('2026-07-02T21:00:00.000Z')).toBe('2026-07-03');
    } finally {
      if (previousTz === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = previousTz;
      }
    }
  });

  it('returns null for empty or invalid values', () => {
    expect(toLocalInputDate('')).toBeNull();
    expect(toLocalInputDate('not-a-date')).toBeNull();
  });
});
