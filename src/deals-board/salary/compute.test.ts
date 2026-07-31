import { describe, expect, it } from 'vitest';

import type { LineItemRow, OpportunityRow } from '../types';
import {
  applyDealOkleykaOverride,
  buildOkleykaDealGroups,
  buildOkleykaSalaryFilename,
  dealGroupsToXlsxMatrix,
  isOkleykaSalaryLineItem,
  marginPctTone,
  sortOkleykaDealGroups,
  sumOkleykaDealTotals,
} from './compute';

const deal = (id: string, over: Partial<OpportunityRow> = {}): OpportunityRow => ({
  id,
  name: `Сделка ${id}`,
  bitrixLink: { primaryLinkUrl: `https://bitrix/${id}` },
  rashodPechat: { amountMicros: 10_000_000, currencyCode: 'RUB' },
  rashodFrezerovka: { amountMicros: 5_000_000, currencyCode: 'RUB' },
  rashodOkleyka: null,
  ...over,
});

const item = (over: Partial<LineItemRow>): LineItemRow =>
  ({
    id: 'li-1',
    opportunityId: 'd1',
    name: 'Позиция',
    tip: 'PLENKA',
    tipDetail: 'NASHI',
    stage: 'OKLEYKA',
    kolichestvo: 2,
    amount: { amountMicros: 50_000_000, currencyCode: 'RUB' },
    ...over,
  }) as LineItemRow;

describe('okleyka salary compute', () => {
  it('filters PLENKA + NASHI + OKLEYKA/GOTOVO', () => {
    expect(isOkleykaSalaryLineItem(item({ id: '1' }))).toBe(true);
    expect(isOkleykaSalaryLineItem(item({ id: '2', stage: 'GOTOVO' }))).toBe(true);
    expect(isOkleykaSalaryLineItem(item({ id: '3', tipDetail: 'NE_NASHI' }))).toBe(false);
    expect(isOkleykaSalaryLineItem(item({ id: '4', stage: 'NOVYY' }))).toBe(false);
  });

  it('sale = unit price × qty; qty <= 0 counts as 1', () => {
    const groups = buildOkleykaDealGroups(
      [item({}), item({ id: 'li-2', kolichestvo: 0, amount: { amountMicros: 30_000_000, currencyCode: 'RUB' } })],
      new Map([['d1', deal('d1')]]),
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]?.positions.map((p) => p.saleRub)).toEqual([50 * 2, 30]);
    expect(groups[0]?.saleRub).toBe(130);
  });

  it('deal economics: print/freza from deal, okleyka null → cost without it, margin deal-level', () => {
    const groups = buildOkleykaDealGroups([item({})], new Map([['d1', deal('d1')]]));
    const g = groups[0]!;
    expect(g.printCostRub).toBe(10);
    expect(g.frezaCostRub).toBe(5);
    expect(g.okleykaCostRub).toBeNull();
    expect(g.costRub).toBe(15);
    expect(g.profitRub).toBe(85);
    expect(g.marginPct).toBeCloseTo(85);
  });

  it('okleyka set on deal reduces profit', () => {
    const groups = buildOkleykaDealGroups(
      [item({})],
      new Map([['d1', deal('d1', { rashodOkleyka: { amountMicros: 20_000_000, currencyCode: 'RUB' } })]]),
    );
    expect(groups[0]?.okleykaCostRub).toBe(20);
    expect(groups[0]?.costRub).toBe(35);
  });

  it('applyDealOkleykaOverride recomputes cost/profit/margin', () => {
    const g = buildOkleykaDealGroups([item({})], new Map([['d1', deal('d1')]]))[0]!;
    const next = applyDealOkleykaOverride(g, 30);
    expect(next.okleykaCostRub).toBe(30);
    expect(next.costRub).toBe(45);
    expect(next.profitRub).toBe(55);
    expect(applyDealOkleykaOverride(next, null).okleykaCostRub).toBeNull();
  });

  it('totals over deals', () => {
    const groups = buildOkleykaDealGroups(
      [item({}), item({ id: 'li-3', opportunityId: 'd2' })],
      new Map([['d1', deal('d1')], ['d2', deal('d2')]]),
    );
    const totals = sumOkleykaDealTotals(groups);
    expect(totals.deals).toBe(2);
    expect(totals.positions).toBe(2);
    expect(totals.sale).toBe(200);
    expect(totals.print).toBe(20);
    expect(totals.okleyka).toBe(0);
  });

  it('sorts groups by margin desc', () => {
    const groups = buildOkleykaDealGroups(
      [
        item({ id: 'a', opportunityId: 'd1' }),
        item({ id: 'b', opportunityId: 'd2' }),
      ],
      new Map([
        ['d1', deal('d1', { rashodOkleyka: { amountMicros: 80_000_000, currencyCode: 'RUB' } })],
        ['d2', deal('d2')],
      ]),
    );
    const sorted = sortOkleykaDealGroups(groups, 'margin', 'desc');
    expect(sorted.map((g) => g.opportunityId)).toEqual(['d2', 'd1']);
  });

  it('xlsx matrix: one row per deal, null okleyka → empty cell', () => {
    const groups = buildOkleykaDealGroups([item({})], new Map([['d1', deal('d1')]]));
    const matrix = dealGroupsToXlsxMatrix(groups);
    expect(matrix[0]).toEqual([
      'Bitrix',
      'Сделка',
      'Позиций',
      'Продажа',
      'Расход печать',
      'Расход фреза',
      'Расход оклейка',
      'Расход итого',
      'Прибыль',
      'Маржа %',
    ]);
    const row = matrix[1]!;
    expect(row[2]).toBe(1);
    expect(row[6]).toBe('');
  });

  it('marginPctTone thresholds', () => {
    expect(marginPctTone(null)).toBe('muted');
    expect(marginPctTone(-1)).toBe('danger');
    expect(marginPctTone(10)).toBe('warning');
    expect(marginPctTone(20)).toBe('ok');
  });

  it('builds dated filename', () => {
    expect(buildOkleykaSalaryFilename(new Date('2026-07-30T12:00:00.000Z'))).toBe(
      'okleyka-salary-2026-07-30.xlsx',
    );
  });
});
