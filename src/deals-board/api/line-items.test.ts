import { describe, expect, it } from 'vitest';

import { buildDealLineItemsFilter, buildDealLineItemsQuery } from './line-items';

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
    const filter = buildDealLineItemsFilter(['id-1'], ['NOVYY', 'V_RABOTE']);

    expect(filter).toBe(
      'and(opportunityId[in]:["id-1"],stage[in]:["NOVYY","V_RABOTE"])',
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
