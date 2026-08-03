import { describe, expect, it } from 'vitest';

import type { OkleykaSalaryEntry } from './fund';
import {
  buildEqualPersonShares,
  planHalfPersonDistribute,
  roundEqualParts,
  sumSharesByOpportunity,
} from './shares';

const salaryEntry = (over: Partial<OkleykaSalaryEntry>): OkleykaSalaryEntry => ({
  id: 'e1',
  name: 'Alice',
  hours: 10,
  rateRub: 500,
  bonusRub: 0,
  periodStart: '2026-07-01',
  periodEnd: '2026-07-15',
  ...over,
});

describe('okleyka deal shares', () => {
  it('roundEqualParts splits 10000 into 15 parts summing to 10000', () => {
    const parts = roundEqualParts(10000, 15);
    expect(parts).toHaveLength(15);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(10000);
    expect(parts.every((p) => p === 666 || p === 667)).toBe(true);
  });

  it('buildEqualPersonShares assigns per entry across deals', () => {
    const rows = buildEqualPersonShares(
      ['e1', 'e2'],
      { e1: 10000, e2: 20000 },
      ['d1', 'd2', 'd3'],
    );
    expect(rows).toHaveLength(6);
    const e1 = rows.filter((r) => r.salaryEntryId === 'e1');
    expect(e1.reduce((s, r) => s + r.amountRub, 0)).toBe(10000);
  });

  it('sumSharesByOpportunity totals amounts', () => {
    const map = sumSharesByOpportunity([
      { opportunityId: 'd1', amountRub: 100 },
      { opportunityId: 'd1', amountRub: 50 },
      { opportunityId: 'd2', amountRub: 10 },
    ]);
    expect(map.get('d1')).toBe(150);
    expect(map.get('d2')).toBe(10);
  });

  it('planHalfPersonDistribute splits each entry equally across deals', () => {
    const rows = planHalfPersonDistribute({
      entries: [
        salaryEntry({ id: 'e1', hours: 10, rateRub: 1000, bonusRub: 0 }),
        salaryEntry({ id: 'e2', hours: 20, rateRub: 1000, bonusRub: 0 }),
      ],
      opportunityIds: ['d1', 'd2', 'd3'],
    });
    expect(rows).toHaveLength(6);
    expect(rows.filter((r) => r.salaryEntryId === 'e1').reduce((s, r) => s + r.amountRub, 0)).toBe(
      10000,
    );
    expect(rows.filter((r) => r.salaryEntryId === 'e2').reduce((s, r) => s + r.amountRub, 0)).toBe(
      20000,
    );
  });

  it('planHalfPersonDistribute returns empty when no deals', () => {
    expect(
      planHalfPersonDistribute({
        entries: [salaryEntry({})],
        opportunityIds: [],
      }),
    ).toEqual([]);
  });
});
