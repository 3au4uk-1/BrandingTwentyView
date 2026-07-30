import { describe, expect, it } from 'vitest';

import type { LineItemRow, OpportunityRow } from '../types';
import {
  buildOkleykaSalaryFilename,
  buildOkleykaSalaryGroups,
  buildOkleykaSalaryRows,
  isOkleykaSalaryLineItem,
  marginPctTone,
  salaryRowsToCsv,
  salaryRowsToXlsxMatrix,
  sortOkleykaSalaryGroups,
  sumOkleykaSalaryTotals,
  type OkleykaSalaryRow,
} from './compute';

const item = (partial: Partial<LineItemRow> & Pick<LineItemRow, 'id'>): LineItemRow => ({
  opportunityId: 'deal-1',
  name: 'Позиция',
  tip: 'PLENKA',
  tipDetail: 'NASHI',
  stage: 'OKLEYKA',
  kolichestvo: 2,
  amount: { amountMicros: 10_000_000, currencyCode: 'RUB' },
  ...partial,
});

describe('okleyka salary compute', () => {
  it('filters PLENKA + NASHI + OKLEYKA/GOTOVO', () => {
    expect(isOkleykaSalaryLineItem(item({ id: '1' }))).toBe(true);
    expect(isOkleykaSalaryLineItem(item({ id: '2', stage: 'GOTOVO' }))).toBe(true);
    expect(isOkleykaSalaryLineItem(item({ id: '3', tipDetail: 'NE_NASHI' }))).toBe(false);
    expect(isOkleykaSalaryLineItem(item({ id: '4', stage: 'NOVYY' }))).toBe(false);
  });

  it('builds profit and margin with null costs as 0', () => {
    const deals = new Map<string, OpportunityRow>([
      [
        'deal-1',
        {
          id: 'deal-1',
          name: 'ПРО / тест',
          bitrixLink: { primaryLinkUrl: 'https://bitrix.example/1' },
        },
      ],
    ]);
    const rows = buildOkleykaSalaryRows(
      [
        item({
          id: 'a',
          stoimostPechati: { amountMicros: 2_000_000, currencyCode: 'RUB' },
        }),
      ],
      deals,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.saleRub).toBe(10);
    expect(rows[0]?.printCostRub).toBe(2);
    expect(rows[0]?.frezaCostRub).toBe(0);
    expect(rows[0]?.okleykaCostRub).toBe(0);
    expect(rows[0]?.costRub).toBe(2);
    expect(rows[0]?.profitRub).toBe(8);
    expect(rows[0]?.marginPct).toBeCloseTo(80);
    expect(rows[0]?.bitrixUrl).toContain('bitrix');
  });

  it('subtracts okleyka cost from profit and margin', () => {
    const deals = new Map<string, OpportunityRow>([
      ['deal-1', { id: 'deal-1', name: 'Сделка', bitrixLink: { primaryLinkUrl: 'https://b' } }],
    ]);
    const rows = buildOkleykaSalaryRows(
      [
        item({
          id: 'a',
          amount: { amountMicros: 100_000_000, currencyCode: 'RUB' },
          stoimostPechati: { amountMicros: 10_000_000, currencyCode: 'RUB' },
          stoimostFrezy: { amountMicros: 5_000_000, currencyCode: 'RUB' },
          stoimostOkleyki: { amountMicros: 20_000_000, currencyCode: 'RUB' },
        }),
      ],
      deals,
    );
    expect(rows[0]?.okleykaCostRub).toBe(20);
    expect(rows[0]?.costRub).toBe(35);
    expect(rows[0]?.profitRub).toBe(65);
    expect(rows[0]?.marginPct).toBeCloseTo(65);
  });

  it('sums totals with separate expense articles', () => {
    const totals = sumOkleykaSalaryTotals([
      {
        lineItemId: 'a',
        opportunityId: 'd',
        bitrixUrl: '',
        dealName: 'A',
        positionName: 'P',
        qty: 1,
        saleRub: 100,
        printCostRub: 10,
        frezaCostRub: 5,
        okleykaCostRub: 20,
        costRub: 35,
        profitRub: 65,
        marginPct: 65,
      },
    ]);
    expect(totals).toMatchObject({
      count: 1,
      sale: 100,
      print: 10,
      freza: 5,
      okleyka: 20,
      cost: 35,
      profit: 65,
    });
    expect(totals.marginPct).toBeCloseTo(65);
  });

  it('groups by deal and sorts groups by margin desc', () => {
    const rows: OkleykaSalaryRow[] = [
      {
        lineItemId: '1',
        opportunityId: 'd1',
        bitrixUrl: 'https://1',
        dealName: 'Alpha',
        positionName: 'P1',
        qty: 1,
        saleRub: 100,
        printCostRub: 0,
        frezaCostRub: 0,
        okleykaCostRub: 90,
        costRub: 90,
        profitRub: 10,
        marginPct: 10,
      },
      {
        lineItemId: '2',
        opportunityId: 'd2',
        bitrixUrl: 'https://2',
        dealName: 'Beta',
        positionName: 'P2',
        qty: 1,
        saleRub: 100,
        printCostRub: 0,
        frezaCostRub: 0,
        okleykaCostRub: 10,
        costRub: 10,
        profitRub: 90,
        marginPct: 90,
      },
    ];
    const groups = sortOkleykaSalaryGroups(buildOkleykaSalaryGroups(rows), 'marginPct', 'desc');
    expect(groups.map((g) => g.dealName)).toEqual(['Beta', 'Alpha']);
  });

  it('marginPctTone thresholds', () => {
    expect(marginPctTone(null)).toBe('muted');
    expect(marginPctTone(-1)).toBe('danger');
    expect(marginPctTone(10)).toBe('warning');
    expect(marginPctTone(20)).toBe('ok');
  });

  it('exports csv with BOM', () => {
    const csv = salaryRowsToCsv([
      {
        lineItemId: 'a',
        opportunityId: 'd',
        bitrixUrl: 'https://x',
        dealName: 'Сделка',
        positionName: 'Поз',
        qty: 1,
        saleRub: 100,
        printCostRub: 10,
        frezaCostRub: 0,
        okleykaCostRub: 0,
        costRub: 10,
        profitRub: 90,
        marginPct: 90,
      },
    ]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('Bitrix;Сделка');
    expect(csv).toContain('90.0');
  });

  it('builds xlsx matrix and dated filename', () => {
    const matrix = salaryRowsToXlsxMatrix([
      {
        lineItemId: 'a',
        opportunityId: 'd',
        bitrixUrl: 'https://x',
        dealName: 'Сделка',
        positionName: 'Поз',
        qty: 1,
        saleRub: 100,
        printCostRub: 10,
        frezaCostRub: 0,
        okleykaCostRub: 0,
        costRub: 10,
        profitRub: 90,
        marginPct: 90,
      },
    ]);
    expect(matrix[0]?.[0]).toBe('Bitrix');
    expect(matrix[1]?.[3]).toBe(1);
    expect(matrix[1]?.[9]).toBe(90);
    expect(buildOkleykaSalaryFilename(new Date('2026-07-30T12:00:00.000Z'))).toBe(
      'okleyka-salary-2026-07-30.xlsx',
    );
  });

  it('xlsx matrix includes okleyka column', () => {
    const matrix = salaryRowsToXlsxMatrix([
      {
        lineItemId: 'a',
        opportunityId: 'd',
        bitrixUrl: 'https://x',
        dealName: 'Сделка',
        positionName: 'Поз',
        qty: 1,
        saleRub: 100,
        printCostRub: 10,
        frezaCostRub: 5,
        okleykaCostRub: 20,
        costRub: 35,
        profitRub: 65,
        marginPct: 65,
      },
    ]);
    expect(matrix[0]).toContain('Расход оклейка');
    const header = matrix[0] as Array<string | number>;
    const okleykaIdx = header.indexOf('Расход оклейка');
    expect(matrix[1]?.[okleykaIdx]).toBe(20);
  });
});
