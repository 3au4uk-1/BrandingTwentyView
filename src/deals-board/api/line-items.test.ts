import { describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_MANUAL_LINE_ITEM_NAME,
  LINE_ITEM_ORIGIN,
} from 'src/constants/line-item-origin';

import {
  buildCreateLineItemInput,
  buildDealLineItemsFilter,
  buildDealLineItemsQuery,
  buildDealLineItemsSearchFilter,
  createLineItemWithClient,
  extractCreatedLineItemId,
  fetchLineItemsForOpportunityIdsWithClient,
  filterLineItemsByQueryFilters,
  isDefaultLineItemHiddenByFilters,
} from './line-items';

describe('buildCreateLineItemInput', () => {
  it('creates a compact default position linked to its deal', () => {
    expect(buildCreateLineItemInput('deal-1')).toEqual({
      name: DEFAULT_MANUAL_LINE_ITEM_NAME,
      opportunityId: 'deal-1',
      stage: 'NOVYY',
      kolichestvo: 1,
      amount: {
        amountMicros: 0,
        currencyCode: 'RUB',
      },
    });
  });

  it('creates the default position through REST with amount', async () => {
    const post = vi.fn().mockResolvedValue({ id: 'item-1' });
    const patch = vi.fn().mockResolvedValue(undefined);

    const id = await createLineItemWithClient({ post, patch } as never, 'deal-1');

    expect(id).toBe('item-1');
    expect(post).toHaveBeenCalledWith('/rest/dealLineItems', {
      name: DEFAULT_MANUAL_LINE_ITEM_NAME,
      opportunityId: 'deal-1',
      stage: 'NOVYY',
      kolichestvo: 1,
      amount: {
        amountMicros: 0,
        currencyCode: 'RUB',
      },
    });
    expect(patch).toHaveBeenCalledWith('/rest/dealLineItems/item-1', {
      istochnik: LINE_ITEM_ORIGIN.TWENTY_MANUAL,
    });
  });

  it('extracts id from wrapped REST create response', async () => {
    const post = vi.fn().mockResolvedValue({
      data: { id: 'item-wrapped', name: 'Новая позиция' },
    });
    const patch = vi.fn().mockResolvedValue(undefined);

    const id = await createLineItemWithClient({ post, patch } as never, 'deal-1');

    expect(id).toBe('item-wrapped');
    expect(patch).toHaveBeenCalledWith('/rest/dealLineItems/item-wrapped', {
      istochnik: LINE_ITEM_ORIGIN.TWENTY_MANUAL,
    });
  });
});

describe('extractCreatedLineItemId', () => {
  it('reads id from direct and wrapped shapes', () => {
    expect(extractCreatedLineItemId({ id: 'a' })).toBe('a');
    expect(extractCreatedLineItemId({ data: { id: 'b' } })).toBe('b');
    expect(extractCreatedLineItemId({ data: { dealLineItem: { id: 'c' } } })).toBe('c');
  });

  it('throws when id is missing', () => {
    expect(() => extractCreatedLineItemId({ data: { name: 'x' } })).toThrow(/missing id/i);
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

  it('recursively preserves order for a 25-id batch without REST stage filters', async () => {
    const opportunityIds = Array.from({ length: 25 }, (_, index) => `deal-${index + 1}`);
    const get = vi.fn().mockImplementation(
      (_path: string, options: { query: { filter: string } }) => {
        const ids = options.query.filter.match(/deal-\d+/g) ?? [];
        if (ids.length > 5) {
          return Promise.reject({ status: 500 });
        }

        expect(options.query.filter).not.toContain('stage[in]');
        return Promise.resolve({
          data: ids.map((opportunityId) => ({
            id: `item-${opportunityId}`,
            name: 'Position',
            opportunityId,
            stage: 'NOVYY',
          })),
        });
      },
    );

    const items = filterLineItemsByQueryFilters(
      await fetchLineItemsForOpportunityIdsWithClient({ get } as never, opportunityIds),
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

describe('filterLineItemsByQueryFilters', () => {
  const items = [
    { id: '1', name: 'A', opportunityId: 'deal-1', stage: 'NOVYY', tip: 'BANNERA' },
    { id: '2', name: 'B', opportunityId: 'deal-1', stage: 'GOTOVO', tip: 'PLENKA' },
  ] as const;

  it('filters by stage and type on the client', () => {
    expect(filterLineItemsByQueryFilters([...items], { stages: ['NOVYY'] })).toEqual([items[0]]);
    expect(filterLineItemsByQueryFilters([...items], { types: ['PLENKA'] })).toEqual([items[1]]);
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
