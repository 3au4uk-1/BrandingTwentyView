import { describe, expect, it } from 'vitest';

import type { LineItemRow, OpportunityRow } from '../types';

import {
  addSearchTerm,
  buildOpportunityFilter,
  buildOpportunitySearchClause,
  filterLineItemsForSearch,
  lineItemMatchesSearch,
  mapChildMatchesToParentIds,
  opportunityMatchesSearch,
  resolveSearchTerms,
} from './search';

const PARENT_NULL = { parentOpportunityId: { is: 'NULL' } };

describe('buildOpportunitySearchClause', () => {
  it('matches opportunity name only when no line item ids', () => {
    expect(buildOpportunitySearchClause('баннер')).toEqual({
      name: { ilike: '%баннер%' },
    });
  });

  it('combines name and line-item opportunity ids with or', () => {
    expect(buildOpportunitySearchClause('баннер', ['opp-1', 'opp-2'])).toEqual({
      or: [{ name: { ilike: '%баннер%' } }, { id: { in: ['opp-1', 'opp-2'] } }],
    });
  });

  it('ORs multiple name terms', () => {
    expect(buildOpportunitySearchClause(['фотобудка', 'брендинг'])).toEqual({
      or: [{ name: { ilike: '%фотобудка%' } }, { name: { ilike: '%брендинг%' } }],
    });
  });
});

describe('resolveSearchTerms', () => {
  it('prefers chips and ignores draft search', () => {
    expect(resolveSearchTerms({ search: 'draft', searchTerms: ['фотобудка', 'брендинг'] })).toEqual([
      'фотобудка',
      'брендинг',
    ]);
  });

  it('treats empty chips as no search', () => {
    expect(resolveSearchTerms({ search: 'draft', searchTerms: [] })).toEqual([]);
  });

  it('falls back to single search when chips unset', () => {
    expect(resolveSearchTerms({ search: '  баннер  ' })).toEqual(['баннер']);
  });
});

describe('addSearchTerm', () => {
  it('dedupes case-insensitively', () => {
    expect(addSearchTerm(['Фото'], 'фото')).toEqual(['Фото']);
    expect(addSearchTerm(['Фото'], 'брендинг')).toEqual(['Фото', 'брендинг']);
  });
});

describe('buildOpportunityFilter', () => {
  it('empty filter still hides grouped children', () => {
    expect(buildOpportunityFilter({})).toEqual({
      and: [PARENT_NULL],
    });
  });

  it('keeps date filter and search together', () => {
    expect(
      buildOpportunityFilter({ datePreset: 'future', search: 'test' }, ['opp-1']),
    ).toEqual({
      and: [
        PARENT_NULL,
        {
          or: [{ loadDate: expect.any(Object) }, { closeDate: expect.any(Object) }],
        },
        {
          or: [{ name: { ilike: '%test%' } }, { id: { in: ['opp-1'] } }],
        },
      ],
    });
  });

  it('adds company filter when company ids are selected', () => {
    expect(buildOpportunityFilter({ companyIds: ['company-1', 'company-2'] })).toEqual({
      and: [PARENT_NULL, { companyId: { in: ['company-1', 'company-2'] } }],
    });
  });

  it('ORs multi keyword searchTerms', () => {
    expect(buildOpportunityFilter({ searchTerms: ['a', 'b'] })).toEqual({
      and: [
        PARENT_NULL,
        { or: [{ name: { ilike: '%a%' } }, { name: { ilike: '%b%' } }] },
      ],
    });
  });

  it('restricts to line-item matched ids when there is no search', () => {
    expect(buildOpportunityFilter({ datePreset: 'future' }, ['opp-1', 'opp-2'])).toEqual({
      and: [
        PARENT_NULL,
        {
          or: [{ loadDate: expect.any(Object) }, { closeDate: expect.any(Object) }],
        },
        { id: { in: ['opp-1', 'opp-2'] } },
      ],
    });
  });

  it('allows empty id list to force no matches without search', () => {
    expect(buildOpportunityFilter({}, [])).toEqual({
      and: [PARENT_NULL, { id: { in: [] } }],
    });
  });

  it('adds opportunity stage in-filter', () => {
    expect(
      buildOpportunityFilter({ opportunityStages: ['V_RABOTE', 'DUBL'] }),
    ).toEqual({
      and: [PARENT_NULL, { stage: { in: ['V_RABOTE', 'DUBL'] } }],
    });
  });

  it('adds amountMicros gte from amountMinRub', () => {
    expect(buildOpportunityFilter({ amountMinRub: 100000 })).toEqual({
      and: [PARENT_NULL, { amount: { amountMicros: { gte: 100_000_000_000 } } }],
    });
  });

  it('ignores a negative amountMinRub but still hides children', () => {
    expect(buildOpportunityFilter({ amountMinRub: -1 })).toEqual({
      and: [PARENT_NULL],
    });
  });

  it('adds a zero amountMinRub clause', () => {
    expect(buildOpportunityFilter({ amountMinRub: 0 })).toEqual({
      and: [PARENT_NULL, { amount: { amountMicros: { gte: 0 } } }],
    });
  });

  it('does not treat lineItemStages as opportunity.stage', () => {
    expect(buildOpportunityFilter({ lineItemStages: ['OKLEYKA'] })).toEqual({
      and: [PARENT_NULL],
    });
  });

  it('skips parentOpportunityId NULL when includeGroupedChildren is true', () => {
    expect(
      buildOpportunityFilter({
        includeGroupedChildren: true,
        companyIds: ['c1'],
      }),
    ).toEqual({
      and: [{ companyId: { in: ['c1'] } }],
    });
  });
});

describe('mapChildMatchesToParentIds', () => {
  it('returns unique parent ids from child matches', () => {
    expect(
      mapChildMatchesToParentIds([
        { parentOpportunityId: 'parent-1' },
        { parentOpportunityId: 'parent-2' },
        { parentOpportunityId: 'parent-1' },
        { parentOpportunityId: null },
        {},
      ]),
    ).toEqual(['parent-1', 'parent-2']);
  });

  it('returns empty when no children have a parent', () => {
    expect(mapChildMatchesToParentIds([{ name: 'solo' }, { parentOpportunityId: '' }])).toEqual(
      [],
    );
  });
});

describe('opportunityMatchesSearch', () => {
  it('matches case-insensitively', () => {
    expect(opportunityMatchesSearch({ name: 'Сделка Баннер' }, 'баннер')).toBe(true);
    expect(opportunityMatchesSearch({ name: 'Сделка Баннер' }, 'визитка')).toBe(false);
  });

  it('matches any of multiple terms', () => {
    expect(opportunityMatchesSearch({ name: 'Сделка Баннер' }, ['визитка', 'баннер'])).toBe(true);
  });
});

describe('lineItemMatchesSearch', () => {
  it('matches name and comment', () => {
    const item: Pick<LineItemRow, 'name' | 'kommentariy'> = {
      name: 'Позиция 1',
      kommentariy: 'срочно',
    };

    expect(lineItemMatchesSearch(item, 'позиция')).toBe(true);
    expect(lineItemMatchesSearch(item, 'срочно')).toBe(true);
    expect(lineItemMatchesSearch(item, 'другое')).toBe(false);
  });
});

describe('filterLineItemsForSearch', () => {
  const recordsById = new Map<string, OpportunityRow>([
    ['opp-1', { id: 'opp-1', name: 'Сделка А' }],
    ['opp-2', { id: 'opp-2', name: 'Сделка Баннер' }],
  ]);

  const lineItems: LineItemRow[] = [
    { id: 'li-1', opportunityId: 'opp-1', name: 'Визитки' },
    { id: 'li-2', opportunityId: 'opp-1', name: 'Баннер 3x6' },
    { id: 'li-3', opportunityId: 'opp-2', name: 'Наклейки' },
  ];

  it('returns all items when search is empty', () => {
    expect(filterLineItemsForSearch(lineItems, '', recordsById)).toEqual(lineItems);
  });

  it('keeps all line items for a deal when only parent name matches search', () => {
    expect(filterLineItemsForSearch(lineItems, 'сделка а', recordsById)).toEqual([
      lineItems[0],
      lineItems[1],
    ]);
  });

  it('keeps only matching line items when parent name does not match', () => {
    expect(filterLineItemsForSearch(lineItems, 'визитки', recordsById)).toEqual([lineItems[0]]);
  });

  it('ORs multiple terms across deals and positions', () => {
    expect(filterLineItemsForSearch(lineItems, ['визитки', 'наклейки'], recordsById)).toEqual([
      lineItems[0],
      lineItems[2],
    ]);
  });
});
