import { describe, expect, it, vi } from 'vitest';

import {
  buildCreateLineItemInput,
  buildDealLineItemsFilter,
  buildDealLineItemsQuery,
  buildDealLineItemsSearchFilter,
  createLineItemWithClient,
  isDefaultLineItemHiddenByFilters,
} from './line-items';

describe('buildCreateLineItemInput', () => {
  it('creates a compact default position linked to its deal', () => {
    expect(buildCreateLineItemInput('deal-1')).toEqual({
      name: 'Новая позиция',
      opportunityId: 'deal-1',
      stage: 'NOVYY',
      kolichestvo: 1,
    });
  });

  it('posts the default position to the deal line items endpoint', async () => {
    const post = vi.fn().mockResolvedValue(undefined);

    await createLineItemWithClient({ post }, 'deal-1');

    expect(post).toHaveBeenCalledWith('/rest/dealLineItems', {
      name: 'Новая позиция',
      opportunityId: 'deal-1',
      stage: 'NOVYY',
      kolichestvo: 1,
    });
  });
});

describe('isDefaultLineItemHiddenByFilters', () => {
  it('detects stage and type filters that hide the default position', () => {
    expect(isDefaultLineItemHiddenByFilters()).toBe(false);
    expect(isDefaultLineItemHiddenByFilters({ stages: ['NOVYY'] })).toBe(false);
    expect(isDefaultLineItemHiddenByFilters({ stages: ['GOTOVO'] })).toBe(true);
    expect(isDefaultLineItemHiddenByFilters({ types: ['BANNERA'] })).toBe(true);
  });
});

describe('buildDealLineItemsFilter', () => {
  it('serializes opportunity ids as JSON array for in filter', () => {
    const filter = buildDealLineItemsFilter([
      '62875f28-7642-428c-9ef6-199bdd737826',
      '6c651915-292b-49e2-bde8-b24849ebbbdc',
    ]);

    expect(filter).toBe(
      'opportunityId[in]:["62875f28-7642-428c-9ef6-199bdd737826","6c651915-292b-49e2-bde8-b24849ebbbdc"]',
    );
  });

  it('combines stage filter with and()', () => {
    const filter = buildDealLineItemsFilter(['id-1'], { stages: ['NOVYY', 'V_RABOTE'] });

    expect(filter).toBe(
      'and(opportunityId[in]:["id-1"],stage[in]:["NOVYY","V_RABOTE"])',
    );
  });

  it('combines type filter with and()', () => {
    const filter = buildDealLineItemsFilter(['id-1'], { types: ['BANNERA', 'PLENKA'] });

    expect(filter).toBe(
      'and(opportunityId[in]:["id-1"],tip[in]:["BANNERA","PLENKA"])',
    );
  });

  it('combines stage and type filters with and()', () => {
    const filter = buildDealLineItemsFilter(['id-1'], {
      stages: ['V_RABOTE'],
      types: ['PLENKA'],
    });

    expect(filter).toBe(
      'and(opportunityId[in]:["id-1"],stage[in]:["V_RABOTE"],tip[in]:["PLENKA"])',
    );
  });
});

describe('buildDealLineItemsSearchFilter', () => {
  it('uses ilike with wildcards for line item name', () => {
    expect(buildDealLineItemsSearchFilter('баннер')).toBe('name[ilike]:"%баннер%"');
  });

  it('combines search with stage filter', () => {
    expect(buildDealLineItemsSearchFilter('баннер', { stages: ['NOVYY'] })).toBe(
      'and(name[ilike]:"%баннер%",stage[in]:["NOVYY"])',
    );
  });

  it('combines search with type filter', () => {
    expect(buildDealLineItemsSearchFilter('баннер', { types: ['BANNERA'] })).toBe(
      'and(name[ilike]:"%баннер%",tip[in]:["BANNERA"])',
    );
  });
});

describe('buildDealLineItemsQuery', () => {
  it('uses compact filter param and pagination cursor', () => {
    expect(buildDealLineItemsQuery(['id-1'], undefined, 'cursor-1')).toEqual({
      limit: 200,
      filter: 'opportunityId[in]:["id-1"]',
      after: 'cursor-1',
    });
  });
});
