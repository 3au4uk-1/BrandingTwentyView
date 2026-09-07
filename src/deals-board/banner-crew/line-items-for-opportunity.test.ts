import { describe, expect, it } from 'vitest';
import { lineItemsForOpportunity } from './line-items-for-opportunity';

describe('lineItemsForOpportunity', () => {
  const fallback = [{ opportunityId: 'opp-a', tip: 'PODRYAD' }];

  it('flattens cache lists and keeps this opportunity', () => {
    expect(
      lineItemsForOpportunity(
        [
          [
            { opportunityId: 'opp-a', tip: 'BANNERA' },
            { opportunityId: 'opp-b', tip: 'PLENKA' },
          ],
          [{ opportunityId: 'opp-a', tip: 'PLENKA' }],
        ],
        'opp-a',
        fallback,
      ),
    ).toEqual([
      { opportunityId: 'opp-a', tip: 'BANNERA' },
      { opportunityId: 'opp-a', tip: 'PLENKA' },
    ]);
  });

  it('falls back when the cache is empty', () => {
    expect(lineItemsForOpportunity([], 'opp-a', fallback)).toBe(fallback);
    expect(lineItemsForOpportunity([undefined, []], 'opp-a', fallback)).toBe(fallback);
  });

  it('does not fall back when cache has other opportunities only', () => {
    expect(
      lineItemsForOpportunity(
        [[{ opportunityId: 'opp-b', tip: 'BANNERA' }]],
        'opp-a',
        fallback,
      ),
    ).toEqual([]);
  });
});
