import { describe, expect, it } from 'vitest';

import type { LineItemRow, OpportunityRow } from '../types';
import {
  buildOkleykaSalaryRows,
  isOkleykaSalaryLineItem,
  salaryRowsToCsv,
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
    expect(rows[0]?.profitRub).toBe(8);
    expect(rows[0]?.marginPct).toBeCloseTo(80);
    expect(rows[0]?.bitrixUrl).toContain('bitrix');
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
        profitRub: 90,
        marginPct: 90,
      },
    ]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('Bitrix;Сделка');
    expect(csv).toContain('90.0');
  });
});
