import { describe, expect, it } from 'vitest';

import type { OkleykaDealGroup } from './compute';
import {
  buildFundSummary,
  buildHalfDistributeScope,
  distributeRemainder,
  entrySumRub,
  filledOkleykaDealIds,
  filterGroupsInPeriod,
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
  bonusRub: 0,
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
  qualifyingSaleRub: 100,
  printCostRub: 0,
  frezaCostRub: 0,
  logisticsCostRub: 0,
  beznalCostRub: 0,
  okleykaCostRub: null,
  costRub: 0,
  profitRub: 100,
  marginPct: 100,
  okleykaSharePct: 100,
  eventDate: '2026-07-01',
  ...over,
});

describe('okleyka salary fund', () => {
  it('entrySumRub includes bonus', () => {
    expect(entrySumRub(entry({ hours: 10, rateRub: 500, bonusRub: 1000 }))).toBe(6000);
    expect(entrySumRub(entry({ hours: 10, rateRub: 500, bonusRub: 0 }))).toBe(5000);
  });

  it('sumFundRub includes bonuses', () => {
    expect(
      sumFundRub([
        entry({ hours: 10, rateRub: 500, bonusRub: 500 }),
        entry({ id: 'e2', hours: 8, rateRub: 600, bonusRub: 200 }),
      ]),
    ).toBe(10500);
  });

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
  });

  it('includes zero-sale deals as distribute targets', () => {
    const groups = [
      group({ opportunityId: 'zero', saleRub: 0, okleykaCostRub: null }),
      group({ opportunityId: 'paid', saleRub: 100, okleykaCostRub: 10 }),
    ];
    const result = distributeRemainder(groups, 600, 'equal');
    expect(result.map((r) => r.opportunityId)).toEqual(['zero']);
    expect(result[0]?.okleykaRub).toBe(600);
  });

  it('sale rule falls back to equal when any target has zero sale', () => {
    const groups = [
      group({ opportunityId: 'a', saleRub: 200, okleykaCostRub: null }),
      group({ opportunityId: 'b', saleRub: 0, okleykaCostRub: 0 }),
    ];
    const result = distributeRemainder(groups, 1001, 'sale');
    const byId = Object.fromEntries(result.map((r) => [r.opportunityId, r.okleykaRub]));
    expect(byId.a! + byId.b!).toBe(1001);
    expect(Math.abs(byId.a! - byId.b!)).toBeLessThanOrEqual(1);
  });

  it('margin rule falls back to equal when total sale is zero', () => {
    const groups = [
      group({ opportunityId: 'a', saleRub: 0, profitRub: 0, okleykaCostRub: null }),
      group({ opportunityId: 'b', saleRub: 0, profitRub: 0, okleykaCostRub: 0 }),
    ];
    const result = distributeRemainder(groups, 999, 'margin');
    const byId = Object.fromEntries(result.map((r) => [r.opportunityId, r.okleykaRub]));
    expect(byId.a! + byId.b!).toBe(999);
    expect(Math.abs(byId.a! - byId.b!)).toBeLessThanOrEqual(1);
  });

  it('filledOkleykaDealIds returns ids with positive okleyka cost', () => {
    const groups = [
      group({ opportunityId: 'filled', okleykaCostRub: 100 }),
      group({ opportunityId: 'empty', okleykaCostRub: null }),
      group({ opportunityId: 'zero', okleykaCostRub: 0 }),
    ];
    expect(filledOkleykaDealIds(groups)).toEqual(['filled']);
  });

  it('equal rule gives every target the same share', () => {
    const groups = [
      group({ opportunityId: 'a', saleRub: 200 }),
      group({ opportunityId: 'b', saleRub: 100, okleykaCostRub: 0 }),
    ];
    const result = distributeRemainder(groups, 1001, 'equal');
    const byId = Object.fromEntries(result.map((r) => [r.opportunityId, r.okleykaRub]));
    expect(byId.a! + byId.b!).toBe(1001);
    expect(Math.abs(byId.a! - byId.b!)).toBeLessThanOrEqual(1);
  });

  it('margin rule equalizes margins across targets', () => {
    const groups = [
      group({ opportunityId: 'a', saleRub: 1000, profitRub: 1000 }),
      group({
        opportunityId: 'b',
        saleRub: 1000,
        printCostRub: 500,
        costRub: 500,
        profitRub: 500,
      }),
    ];
    const result = distributeRemainder(groups, 700, 'margin');
    const byId = Object.fromEntries(result.map((r) => [r.opportunityId, r.okleykaRub]));
    // m = (1500 − 700) / 2000 = 40% → a: 1000 − 400 = 600, b: 500 − 400 = 100
    expect(byId.a).toBe(600);
    expect(byId.b).toBe(100);
  });

  it('margin rule never assigns negative okleyka to low-margin deals', () => {
    const groups = [
      group({ opportunityId: 'a', saleRub: 1000, profitRub: 1000 }),
      group({
        opportunityId: 'b',
        saleRub: 1000,
        printCostRub: 500,
        costRub: 500,
        profitRub: 500,
      }),
    ];
    const result = distributeRemainder(groups, 300, 'margin');
    // m over both would take from b (500 − 600 < 0) → b excluded, a takes all
    expect(result).toEqual([{ opportunityId: 'a', okleykaRub: 300 }]);
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

  it('filterGroupsInPeriod keeps deals whose eventDate is inside period', () => {
    const groups = [
      group({ opportunityId: 'a', eventDate: '2026-07-10', saleRub: 100 }),
      group({ opportunityId: 'b', eventDate: '2026-07-20', saleRub: 100 }),
    ];
    expect(
      filterGroupsInPeriod(groups, { dateFrom: '2026-07-01', dateTo: '2026-07-15' }).map(
        (g) => g.opportunityId,
      ),
    ).toEqual(['a']);
  });

  it('buildHalfDistributeScope does not spend first-half fund on second-half deals', () => {
    const entries = [
      entry({
        id: 'e1',
        hours: 10,
        rateRub: 100,
        periodStart: '2026-07-01',
        periodEnd: '2026-07-15',
      }),
    ];
    const groups = [
      group({
        opportunityId: 'early',
        eventDate: '2026-07-10',
        saleRub: 100,
        okleykaCostRub: null,
        profitRub: 100,
      }),
      group({
        opportunityId: 'late',
        eventDate: '2026-07-20',
        saleRub: 900,
        okleykaCostRub: null,
        profitRub: 900,
      }),
    ];
    const scope = buildHalfDistributeScope({
      half: 'first',
      year: 2026,
      monthIndex: 6,
      splitDay: 15,
      entries,
      groups,
      rule: 'sale',
    });
    expect(scope.fund.fundRub).toBe(1000);
    expect(scope.distribution.map((d) => d.opportunityId)).toEqual(['early']);
    expect(scope.distribution[0]?.okleykaRub).toBe(1000);
  });
});
