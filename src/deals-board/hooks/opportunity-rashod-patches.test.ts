import { describe, expect, it } from 'vitest';

import type { OpportunityRow } from '../types';
import { buildOpportunityRashodPatches, mergeOpportunityRashodPatches } from './opportunity-rashod-patches';

describe('opportunity rashod patches', () => {
  it('keeps current base fields when merging cached rashod fields for the same id', () => {
    const cachedRows: OpportunityRow[] = [
      {
        id: 'opp-1',
        name: 'Old deal name',
        amount: { amountMicros: 1_000_000, currencyCode: 'RUB' },
        rashodItogo: { amountMicros: 250_000, currencyCode: 'RUB' },
      },
    ];
    const currentRows: OpportunityRow[] = [
      {
        id: 'opp-1',
        name: 'Updated deal name',
        amount: { amountMicros: 2_000_000, currencyCode: 'RUB' },
      },
    ];

    const patches = buildOpportunityRashodPatches(cachedRows);

    expect(mergeOpportunityRashodPatches(currentRows, patches)).toEqual([
      {
        id: 'opp-1',
        name: 'Updated deal name',
        amount: { amountMicros: 2_000_000, currencyCode: 'RUB' },
        rashodItogo: { amountMicros: 250_000, currencyCode: 'RUB' },
      },
    ]);
    expect(patches['opp-1']).not.toHaveProperty('name');
    expect(patches['opp-1']).not.toHaveProperty('amount');
  });
});
