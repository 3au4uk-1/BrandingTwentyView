import { describe, expect, it } from 'vitest';

import { getCurrentMonthMode, resolveOkleykaDateRange } from './date-range';

describe('okleyka date-range', () => {
  it('defaults to calendar month of now', () => {
    const mode = getCurrentMonthMode(new Date(2026, 6, 30));
    expect(mode).toEqual({ kind: 'month', year: 2026, monthIndex: 6 });
    expect(resolveOkleykaDateRange(mode)).toEqual({
      dateFrom: '2026-07-01',
      dateTo: '2026-07-31',
    });
  });

  it('accepts custom range', () => {
    expect(
      resolveOkleykaDateRange({ kind: 'range', dateFrom: '2026-07-01', dateTo: '2026-07-15' }),
    ).toEqual({ dateFrom: '2026-07-01', dateTo: '2026-07-15' });
  });

  it('rejects inverted range', () => {
    expect(
      resolveOkleykaDateRange({ kind: 'range', dateFrom: '2026-07-20', dateTo: '2026-07-01' }),
    ).toEqual({ error: 'Укажите корректный диапазон дат' });
  });
});
