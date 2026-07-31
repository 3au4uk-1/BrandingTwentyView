import { describe, expect, it } from 'vitest';

import type { OkleykaDealGroup } from './compute';
import {
  buildFundSummary,
  distributeRemainder,
  entrySumRub,
  latestRateByName,
  pickPreviousPeriodEntries,
  saleShareHintRub,
  sumFundRub,
  type OkleykaSalaryEntry,
} from './fund';

const entry = (over: Partial<OkleykaSalaryEntry>): OkleykaSalaryEntry => ({
  id: 'e1',
  name: 'Иван',
  hours: 10,
  rateRub: 500,
  periodStart: '2026-07-01',
  periodEnd: '2026-07-15',
  ...over,
});

const group = (over: Partial<OkleykaDealGroup>): OkleykaDealGroup => ({
  opportunityId: 'd1',
  dealName: 'Сделка',
  bitrixUrl: '',
  positions: [],
  saleRub: 100,
  printCostRub: 0,
  frezaCostRub: 0,
  okleykaCostRub: null,
  costRub: 0,
  profitRub: 100,
  marginPct: 100,
  ...over,
});

describe('okleyka salary fund', () => {
  it('fund and remainder', () => {
    const entries = [entry({}), entry({ id: 'e2', hours: 8, rateRub: 600 })];
    expect(entrySumRub(entries[0]!)).toBe(5000);
    expect(sumFundRub(entries)).toBe(9800);
    const summary = buildFundSummary(entries, [
      group({ okleykaCostRub: 3000 }),
      group({ opportunityId: 'd2' }),
    ]);
    expect(summary).toEqual({ fundRub: 9800, spentRub: 3000, remainderRub: 6800 });
  });

  it('sale share hint proportional to fund', () => {
    const groups = [group({ saleRub: 300 }), group({ opportunityId: 'd2', saleRub: 100 })];
    expect(saleShareHintRub(300, groups, 8000)).toBe(6000);
    expect(saleShareHintRub(300, groups, 0)).toBeNull();
    expect(saleShareHintRub(300, [group({ saleRub: 0 })], 8000)).toBeNull();
  });

  it('distributes remainder over empty/zero okleyka deals proportionally, rounding fixed on largest', () => {
    const groups = [
      group({ opportunityId: 'a', saleRub: 200, okleykaCostRub: null }),
      group({ opportunityId: 'b', saleRub: 100, okleykaCostRub: 0 }),
      group({ opportunityId: 'c', saleRub: 500, okleykaCostRub: 999 }),
    ];
    const result = distributeRemainder(groups, 1000);
    expect(result).toHaveLength(2);
    const total = result.reduce((s, r) => s + r.okleykaRub, 0);
    expect(total).toBe(1000);
    expect(result.find((r) => r.opportunityId === 'a')?.okleykaRub).toBe(667);
    expect(result.find((r) => r.opportunityId === 'b')?.okleykaRub).toBe(333);
  });

  it('distribution edge cases', () => {
    expect(distributeRemainder([group({})], 0)).toEqual([]);
    expect(distributeRemainder([group({ okleykaCostRub: 10 })], 500)).toEqual([]);
    expect(distributeRemainder([group({ saleRub: 0 })], 500)).toEqual([]);
  });

  it('picks the latest finished period', () => {
    const entries = [
      entry({ id: '1', periodStart: '2026-06-16', periodEnd: '2026-06-30' }),
      entry({ id: '2', periodStart: '2026-06-16', periodEnd: '2026-06-30', name: 'Пётр' }),
      entry({ id: '3', periodStart: '2026-06-01', periodEnd: '2026-06-15' }),
    ];
    expect(pickPreviousPeriodEntries(entries).map((e) => e.id)).toEqual(['1', '2']);
    expect(pickPreviousPeriodEntries([])).toEqual([]);
  });

  it('latest rate by name (case-insensitive, latest periodEnd wins)', () => {
    const entries = [
      entry({ id: '1', rateRub: 500, periodEnd: '2026-06-15' }),
      entry({ id: '2', rateRub: 550, periodEnd: '2026-06-30' }),
      entry({ id: '3', name: 'Пётр', rateRub: 700, periodEnd: '2026-06-30' }),
    ];
    expect(latestRateByName(entries, 'иван')).toBe(550);
    expect(latestRateByName(entries, 'Нет такого')).toBeNull();
  });
});
