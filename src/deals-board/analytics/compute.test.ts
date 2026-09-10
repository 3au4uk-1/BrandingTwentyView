import { describe, expect, it } from 'vitest';

import {
  computeMonthlyFinance,
  currencyToRub,
  getMonthKey,
  lineItemSaleRub,
  shiftMonthKey,
} from './compute';

describe('analytics compute', () => {
  it('converts micros to rubles', () => {
    expect(currencyToRub({ amountMicros: 1_500_000_000 })).toBe(1500);
    expect(currencyToRub(null)).toBe(0);
  });

  it('lineItemSaleRub multiplies unit by qty and skips OTMENA', () => {
    expect(
      lineItemSaleRub({
        stage: 'NOVYY',
        kolichestvo: 2,
        amount: { amountMicros: 6_000_000_000, currencyCode: 'RUB' },
      }),
    ).toBe(12000);
    expect(
      lineItemSaleRub({
        stage: 'OTMENA',
        kolichestvo: 9,
        amount: { amountMicros: 6_000_000_000, currencyCode: 'RUB' },
      }),
    ).toBe(0);
  });

  it('shifts month keys', () => {
    expect(shiftMonthKey('2026-07', -1)).toBe('2026-06');
    expect(shiftMonthKey('2026-01', -1)).toBe('2025-12');
  });

  it('computes turnover, expense and margin for a month', () => {
    const monthKey = getMonthKey(new Date(2026, 6, 15));
    const finance = computeMonthlyFinance(
      [
        {
          id: 'd1',
          name: 'Deal',
          loadDate: '2026-07-10T10:00:00.000Z',
          rashodItogo: { amountMicros: 200_000_000 },
          rashodPechat: { amountMicros: 100_000_000 },
          rashodLogistika: { amountMicros: 100_000_000 },
        },
        {
          id: 'd2',
          name: 'Other month',
          loadDate: '2026-06-01T10:00:00.000Z',
          rashodItogo: { amountMicros: 999_000_000 },
        },
      ],
      [
        {
          id: 'i1',
          opportunityId: 'd1',
          name: 'A',
          stage: 'NOVYY',
          amount: { amountMicros: 1_000_000_000, currencyCode: 'RUB' },
        },
        {
          id: 'i2',
          opportunityId: 'd1',
          name: 'B',
          stage: 'OTMENA',
          amount: { amountMicros: 500_000_000, currencyCode: 'RUB' },
        },
      ],
      monthKey,
    );

    expect(finance.dealCount).toBe(1);
    expect(finance.positionCount).toBe(1);
    expect(finance.turnoverRub).toBe(1000);
    expect(finance.expenseRub).toBe(200);
    expect(finance.marginRub).toBe(800);
    expect(finance.marginPct).toBe(80);
    expect(finance.breakdown.pechat).toBe(100);
  });

  it('excludes OTMENA opportunities from dealCount and expense', () => {
    const monthKey = getMonthKey(new Date(2026, 6, 15));
    const finance = computeMonthlyFinance(
      [
        {
          id: 'd1',
          name: 'Active',
          stage: 'NOVYY',
          loadDate: '2026-07-10T10:00:00.000Z',
          rashodItogo: { amountMicros: 200_000_000 },
        },
        {
          id: 'd2',
          name: 'Cancelled',
          stage: 'OTMENA',
          loadDate: '2026-07-11T10:00:00.000Z',
          rashodItogo: { amountMicros: 999_000_000 },
        },
      ],
      [
        {
          id: 'i1',
          opportunityId: 'd1',
          name: 'A',
          stage: 'NOVYY',
          amount: { amountMicros: 1_000_000_000, currencyCode: 'RUB' },
        },
      ],
      monthKey,
    );
    expect(finance.dealCount).toBe(1);
    expect(finance.expenseRub).toBe(200);
    expect(finance.turnoverRub).toBe(1000);
  });
});
