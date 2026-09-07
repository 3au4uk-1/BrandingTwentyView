import { describe, expect, it } from 'vitest';
import { lineItemsForOpportunity } from './line-items-for-opportunity';

describe('lineItemsForOpportunity', () => {
  const fallback = [{ id: 'podryad', opportunityId: 'opp-a', tip: 'PODRYAD' }];

  it('flattens cache lists and keeps this opportunity', () => {
    expect(
      lineItemsForOpportunity(
        [
          [
            { id: 'banner', opportunityId: 'opp-a', tip: 'BANNERA' },
            { id: 'film-b', opportunityId: 'opp-b', tip: 'PLENKA' },
          ],
          [{ id: 'film-a', opportunityId: 'opp-a', tip: 'PLENKA' }],
        ],
        'opp-a',
        fallback,
      ),
    ).toEqual([
      { id: 'podryad', opportunityId: 'opp-a', tip: 'PODRYAD' },
      { id: 'banner', opportunityId: 'opp-a', tip: 'BANNERA' },
      { id: 'film-a', opportunityId: 'opp-a', tip: 'PLENKA' },
    ]);
  });

  it('falls back when the cache is empty', () => {
    expect(lineItemsForOpportunity([], 'opp-a', fallback)).toBe(fallback);
    expect(lineItemsForOpportunity([undefined, []], 'opp-a', fallback)).toBe(fallback);
  });

  it('keeps fallback when cache has other opportunities only', () => {
    expect(
      lineItemsForOpportunity(
        [[{ id: 'other', opportunityId: 'opp-b', tip: 'BANNERA' }]],
        'opp-a',
        fallback,
      ),
    ).toBe(fallback);
  });

  it('unions unfiltered fallback with filtered cache so BANNERA stays visible', () => {
    const allDealLineItems = [
      { id: 'film', opportunityId: 'opp-a', tip: 'PLENKA' },
      { id: 'banner', opportunityId: 'opp-a', tip: 'BANNERA' },
    ];
    const filteredCache = [[{ id: 'film', opportunityId: 'opp-a', tip: 'PLENKA' }]];

    const result = lineItemsForOpportunity(filteredCache, 'opp-a', allDealLineItems);

    expect(result.map((item) => item.tip).sort()).toEqual(['BANNERA', 'PLENKA']);
    expect(result.filter((item) => item.id === 'film')).toHaveLength(1);
  });
});
