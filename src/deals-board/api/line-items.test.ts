import { describe, expect, it, vi } from 'vitest';

import {
  buildCreateLineItemInput,
  buildDealLineItemsFilter,
  buildDealLineItemsQuery,
  buildDealLineItemsSearchFilter,
  createLineItemWithClient,
  fetchLineItemsForOpportunityIdsWithClient,
  isDefaultLineItemHiddenByFilters,
} from './line-items';

describe('buildCreateLineItemInput', () => {
  it('creates a compact default position linked to its deal', () => {
    expect(buildCreateLineItemInput('deal-1')).toEqual({
      name: 'Новая позиция',
      opportunityId: 'deal-1',
      stage: 'NOVYY',
      kolichestvo: 1,
      amount: {
        amountMicros: 0,
        currencyCode: 'RUB',
      },
    });
  });

  it('creates the default position through the proven GraphQL mutation', async () => {
    const mutation = vi.fn().mockResolvedValue({ createDealLineItem: { id: 'item-1' } });

    await createLineItemWithClient({ mutation } as never, 'deal-1');

    expect(mutation).toHaveBeenCalledWith({
      createDealLineItem: {
        __args: {
          data: {
            name: 'Новая позиция',
            opportunityId: 'deal-1',
            stage: 'NOVYY',
            kolichestvo: 1,
            amount: {
              amountMicros: 0,
              currencyCode: 'RUB',
            },
          },
        },
        id: true,
      },
    });
  });
});

describe('fetchLineItemsForOpportunityIdsWithClient', () => {
  it('splits a failed server batch until smaller requests succeed', async () => {
    const get = vi.fn().mockImplementation(
      (_path: string, options: { query: { filter: string } }) => {
        const filter = options.query.filter;
        if (filter.includes('deal-1') && filter.includes('deal-2')) {
          return Promise.reject({ status: 500 });
        }

        const opportunityId = filter.includes('deal-1') ? 'deal-1' : 'deal-2';
        return Promise.resolve({
          data: [{ id: `item-${opportunityId}`, name: 'Position', opportunityId }],
        });
      },
    );

    const items = await fetchLineItemsForOpportunityIdsWithClient(
      { get } as never,
      ['deal-1', 'deal-2'],
    );

    expect(items.map((item) => item.opportunityId)).toEqual(['deal-1', 'deal-2']);
    expect(get).toHaveBeenCalledTimes(3);
  });

  it('recursively preserves order and filters for a 25-id batch', async () => {
    const opportunityIds = Array.from({ length: 25 }, (_, index) => `deal-${index + 1}`);
    const get = vi.fn().mockImplementation(
      (_path: string, options: { query: { filter: string } }) => {
        const ids = options.query.filter.match(/deal-\d+/g) ?? [];
        if (ids.length > 5) {
          return Promise.reject({ status: 500 });
        }

        expect(options.query.filter).toContain('stage[in]:["NOVYY"]');
        return Promise.resolve({
          data: ids.map((opportunityId) => ({
            id: `item-${opportunityId}`,
            name: 'Position',
            opportunityId,
          })),
        });
      },
    );

    const items = await fetchLineItemsForOpportunityIdsWithClient(
      { get } as never,
      opportunityIds,
      { stages: ['NOVYY'] },
    );

    expect(items.map((item) => item.opportunityId)).toEqual(opportunityIds);
    expect(get.mock.calls.length).toBeGreaterThan(3);
  });

  it('does not retry a failed singleton request', async () => {
    const error = { status: 500 };
    const get = vi.fn().mockRejectedValue(error);

    await expect(
      fetchLineItemsForOpportunityIdsWithClient({ get } as never, ['deal-1']),
    ).rejects.toBe(error);
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('passes non-server errors through without splitting', async () => {
    const error = { status: 400 };
    const get = vi.fn().mockRejectedValue(error);

    await expect(
      fetchLineItemsForOpportunityIdsWithClient(
        { get } as never,
        ['deal-1', 'deal-2'],
      ),
    ).rejects.toBe(error);
    expect(get).toHaveBeenCalledTimes(1);
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
