import { describe, expect, it } from 'vitest';

import type { LineItemRow, OpportunityRow } from '../types';

import {
  buildOpportunityFilter,
  buildOpportunitySearchClause,
  filterLineItemsForSearch,
  lineItemMatchesSearch,
  opportunityMatchesSearch,
} from './search';

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
});

describe('buildOpportunityFilter', () => {
  it('keeps date filter and search together', () => {
    expect(
      buildOpportunityFilter({ datePreset: 'future', search: 'test' }, ['opp-1']),
    ).toEqual({
      and: [
        { loadDate: expect.any(Object) },
        {
          or: [{ name: { ilike: '%test%' } }, { id: { in: ['opp-1'] } }],
        },
      ],
    });
  });

  it('adds company filter when company ids are selected', () => {
    expect(buildOpportunityFilter({ companyIds: ['company-1', 'company-2'] })).toEqual({
      and: [{ companyId: { in: ['company-1', 'company-2'] } }],
    });
  });
});

describe('opportunityMatchesSearch', () => {
  it('matches case-insensitively', () => {
    expect(opportunityMatchesSearch({ name: 'Сделка Баннер' }, 'баннер')).toBe(true);
    expect(opportunityMatchesSearch({ name: 'Сделка Баннер' }, 'визитка')).toBe(false);
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
});
