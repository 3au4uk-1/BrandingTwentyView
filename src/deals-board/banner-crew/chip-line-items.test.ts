import { describe, expect, it } from 'vitest';
import {
  flattenChipLineItemsForDeals,
  groupLineItemsByOpportunityId,
  uniqueOpportunityIds,
} from './chip-line-items';

describe('uniqueOpportunityIds', () => {
  it('unions current-page ids with accumulated mobile ids without duplicates', () => {
    expect(
      uniqueOpportunityIds(
        ['page-deal', 'shared'],
        ['prev-page-deal', 'shared', 'page-deal'],
      ),
    ).toEqual(['page-deal', 'shared', 'prev-page-deal']);
  });

  it('skips empty ids', () => {
    expect(uniqueOpportunityIds(['a', ''], ['', 'b'])).toEqual(['a', 'b']);
  });
});

describe('groupLineItemsByOpportunityId', () => {
  it('groups unfiltered items so a previous-page deal keeps BANNERA', () => {
    const grouped = groupLineItemsByOpportunityId([
      { id: 'film', opportunityId: 'prev', tip: 'PLENKA' },
      { id: 'banner', opportunityId: 'prev', tip: 'BANNERA' },
      { id: 'cur', opportunityId: 'page', tip: 'PLENKA' },
    ]);

    expect(grouped.prev?.map((item) => item.tip).sort()).toEqual(['BANNERA', 'PLENKA']);
    expect(grouped.page).toEqual([{ id: 'cur', opportunityId: 'page', tip: 'PLENKA' }]);
  });
});

describe('flattenChipLineItemsForDeals', () => {
  it('includes previous-page mixed deals from the unfiltered map, not only current page', () => {
    const unfiltered = {
      prev: [
        { id: 'film', opportunityId: 'prev', tip: 'PLENKA' },
        { id: 'banner', opportunityId: 'prev', tip: 'BANNERA' },
      ],
      page: [{ id: 'p1', opportunityId: 'page', tip: 'PLENKA' }],
    };
    const fallback = {
      page: [{ id: 'p1', opportunityId: 'page', tip: 'PLENKA' }],
    };

    const result = flattenChipLineItemsForDeals(['page', 'prev'], unfiltered, fallback);

    expect(result.some((item) => item.id === 'banner')).toBe(true);
    expect(result.filter((item) => item.opportunityId === 'prev').map((item) => item.tip).sort()).toEqual(
      ['BANNERA', 'PLENKA'],
    );
  });

  it('falls back to filtered children when a deal is missing from the unfiltered map', () => {
    expect(
      flattenChipLineItemsForDeals(
        ['page'],
        {},
        { page: [{ id: 'p1', opportunityId: 'page', tip: 'PLENKA' }] },
      ),
    ).toEqual([{ id: 'p1', opportunityId: 'page', tip: 'PLENKA' }]);
  });

  it('does not drop current-page items when previous-page ids are also present', () => {
    const result = flattenChipLineItemsForDeals(
      ['page', 'prev'],
      {
        page: [{ id: 'page-banner', opportunityId: 'page', tip: 'BANNERA' }],
        prev: [{ id: 'prev-banner', opportunityId: 'prev', tip: 'BANNERA' }],
      },
      {},
    );

    expect(result.map((item) => item.id).sort()).toEqual(['page-banner', 'prev-banner']);
  });
});
