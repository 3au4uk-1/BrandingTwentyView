import { describe, expect, it } from 'vitest';

import type { FilterClause } from './types';
import {
  applyAmountMinToClauses,
  formatAmountMinRub,
  parseAmountMinRub,
  rublesToAmountMicros,
} from './amount-min';

describe('parseAmountMinRub', () => {
  it('parses spaces and comma decimals', () => {
    expect(parseAmountMinRub('100 000')).toBe(100000);
    expect(parseAmountMinRub('100000,5')).toBe(100000.5);
  });

  it('returns undefined for empty, text, and negative', () => {
    expect(parseAmountMinRub('')).toBeUndefined();
    expect(parseAmountMinRub('  ')).toBeUndefined();
    expect(parseAmountMinRub('abc')).toBeUndefined();
    expect(parseAmountMinRub('-1')).toBeUndefined();
  });
});

describe('rublesToAmountMicros', () => {
  it('converts 100000 rubles to micros', () => {
    expect(rublesToAmountMicros(100000)).toBe(100_000_000_000);
  });

  it('rounds fractional rubles', () => {
    expect(rublesToAmountMicros(100000.5)).toBe(Math.round(100000.5 * 1_000_000));
  });
});

describe('formatAmountMinRub', () => {
  it('uses regular spaces as thousands separators', () => {
    expect(formatAmountMinRub(100000)).toBe('100 000');
  });
});

describe('applyAmountMinToClauses', () => {
  const stageClause: FilterClause = {
    id: 'stage-1',
    level: 'deal',
    field: 'stage',
    operator: 'in',
    value: ['NOVYY'],
  };

  it('upserts a gte amount clause and keeps other clauses', () => {
    const next = applyAmountMinToClauses([stageClause], '100 000');
    expect(next).toHaveLength(2);
    expect(next).toContainEqual(stageClause);
    expect(next.find((clause) => clause.field === 'amount')).toEqual({
      id: expect.any(String),
      level: 'deal',
      field: 'amount',
      operator: 'gte',
      value: 100000,
    });
  });

  it('keeps the existing amount clause id on update', () => {
    const existing: FilterClause = {
      id: 'amt-1',
      level: 'deal',
      field: 'amount',
      operator: 'gte',
      value: 1,
    };
    const next = applyAmountMinToClauses([existing], '50');
    expect(next).toEqual([
      { id: 'amt-1', level: 'deal', field: 'amount', operator: 'gte', value: 50 },
    ]);
  });

  it('removes the amount clause when input is empty or invalid', () => {
    const existing: FilterClause = {
      id: 'amt-1',
      level: 'deal',
      field: 'amount',
      operator: 'gte',
      value: 100000,
    };
    expect(applyAmountMinToClauses([stageClause, existing], '')).toEqual([stageClause]);
    expect(applyAmountMinToClauses([existing], 'abc')).toEqual([]);
  });
});
