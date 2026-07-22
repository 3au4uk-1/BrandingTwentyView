import { describe, expect, it } from 'vitest';

import {
  formatDaySeparatorLabel,
  getOpportunityDayKey,
  shouldInsertDaySeparatorBefore,
  shouldShowDaySeparators,
} from './day-separators';

describe('shouldShowDaySeparators', () => {
  it('is true for empty sort (defaults to loadDate)', () => {
    expect(shouldShowDaySeparators([])).toBe(true);
  });

  it('is true for loadDate sort', () => {
    expect(
      shouldShowDaySeparators([{ field: 'loadDate', direction: 'AscNullsFirst' }]),
    ).toBe(true);
  });

  it('is false for non-date primary sort', () => {
    expect(shouldShowDaySeparators([{ field: 'name', direction: 'AscNullsFirst' }])).toBe(
      false,
    );
  });
});

describe('getOpportunityDayKey', () => {
  it('uses loadDate calendar day', () => {
    expect(getOpportunityDayKey({ loadDate: '2026-07-14', closeDate: null })).toBe(
      '2026-07-14',
    );
  });

  it('falls back to closeDate', () => {
    expect(getOpportunityDayKey({ loadDate: null, closeDate: '2026-07-15' })).toBe(
      '2026-07-15',
    );
  });
});

describe('formatDaySeparatorLabel', () => {
  it('omits year when same as now', () => {
    expect(formatDaySeparatorLabel('2026-07-14', new Date('2026-03-01'))).toBe('14 июля');
  });

  it('includes year when different', () => {
    expect(formatDaySeparatorLabel('2025-07-14', new Date('2026-03-01'))).toBe(
      '14 июля 2025',
    );
  });
});

describe('shouldInsertDaySeparatorBefore', () => {
  it('inserts for first row with a day key', () => {
    expect(shouldInsertDaySeparatorBefore(null, '2026-07-14', true)).toBe(true);
  });

  it('inserts when day changes', () => {
    expect(shouldInsertDaySeparatorBefore('2026-07-14', '2026-07-15', true)).toBe(true);
  });

  it('skips when same day', () => {
    expect(shouldInsertDaySeparatorBefore('2026-07-14', '2026-07-14', true)).toBe(false);
  });

  it('skips when disabled', () => {
    expect(shouldInsertDaySeparatorBefore(null, '2026-07-14', false)).toBe(false);
  });
});
