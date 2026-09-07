import { describe, expect, it } from 'vitest';

import type { FilterClause } from './types';
import { filterDealsAndLineItems } from './apply-line-item-filters';

describe('filterDealsAndLineItems', () => {
  it('hides non-matching positions but keeps deal when one matches', () => {
    const result = filterDealsAndLineItems({
      deals: [{ id: 'd1', name: 'Deal 1' }],
      lineItemsByOppId: {
        d1: [
          { id: 'a', opportunityId: 'd1', stage: 'GOTOVO', name: 'A' },
          { id: 'b', opportunityId: 'd1', stage: 'NOVYY', name: 'B' },
        ],
      },
      clauses: [{ id: '1', level: 'lineItem', field: 'stage', operator: 'in', value: ['GOTOVO'] }],
      showAllPositionOppIds: new Set(),
    });
    expect(result.deals.map((d) => d.id)).toEqual(['d1']);
    expect(result.lineItemsByOppId.d1.map((i) => i.id)).toEqual(['a']);
  });

  it('show-all reveals non-matching positions for that deal', () => {
    const result = filterDealsAndLineItems({
      deals: [{ id: 'd1', name: 'Deal 1' }],
      lineItemsByOppId: {
        d1: [
          { id: 'a', opportunityId: 'd1', stage: 'GOTOVO', name: 'A' },
          { id: 'b', opportunityId: 'd1', stage: 'NOVYY', name: 'B' },
        ],
      },
      clauses: [{ id: '1', level: 'lineItem', field: 'stage', operator: 'in', value: ['GOTOVO'] }],
      showAllPositionOppIds: new Set(['d1']),
    });
    expect(result.lineItemsByOppId.d1.map((i) => i.id).sort()).toEqual(['a', 'b']);
  });

  it('drops deal when no line items match', () => {
    const result = filterDealsAndLineItems({
      deals: [
        { id: 'd1', name: 'Deal 1' },
        { id: 'd2', name: 'Deal 2' },
      ],
      lineItemsByOppId: {
        d1: [{ id: 'a', opportunityId: 'd1', stage: 'NOVYY', name: 'A' }],
        d2: [{ id: 'b', opportunityId: 'd2', stage: 'GOTOVO', name: 'B' }],
      },
      clauses: [{ id: '1', level: 'lineItem', field: 'stage', operator: 'in', value: ['GOTOVO'] }],
      showAllPositionOppIds: new Set(),
    });
    expect(result.deals.map((d) => d.id)).toEqual(['d2']);
    expect(result.lineItemsByOppId.d2.map((i) => i.id)).toEqual(['b']);
    expect(result.lineItemsByOppId.d1).toBeUndefined();
  });

  it('passes through all deals and line items when no line-item clauses', () => {
    const deals = [{ id: 'd1', name: 'Deal 1' }];
    const lineItemsByOppId = {
      d1: [
        { id: 'a', opportunityId: 'd1', stage: 'NOVYY', name: 'A' },
        { id: 'b', opportunityId: 'd1', stage: 'GOTOVO', name: 'B' },
      ],
    };
    const clauses: FilterClause[] = [
      { id: '1', level: 'deal', field: 'companyId', operator: 'in', value: ['c1'] },
    ];

    const result = filterDealsAndLineItems({
      deals,
      lineItemsByOppId,
      clauses,
      showAllPositionOppIds: new Set(),
    });

    expect(result.deals).toEqual(deals);
    expect(result.lineItemsByOppId).toEqual(lineItemsByOppId);
  });

  it('filters line items by tip in-clause', () => {
    const result = filterDealsAndLineItems({
      deals: [{ id: 'd1', name: 'Deal 1' }],
      lineItemsByOppId: {
        d1: [
          { id: 'a', opportunityId: 'd1', tip: 'BANNERA', name: 'A' },
          { id: 'b', opportunityId: 'd1', tip: 'PLENKA', name: 'B' },
        ],
      },
      clauses: [{ id: '1', level: 'lineItem', field: 'tip', operator: 'in', value: ['BANNERA'] }],
      showAllPositionOppIds: new Set(),
    });
    expect(result.deals.map((d) => d.id)).toEqual(['d1']);
    expect(result.lineItemsByOppId.d1.map((i) => i.id)).toEqual(['a']);
  });

  it('keeps BANNERA in unfiltered allDealLineItems when type filter hides it from children', () => {
    const lineItemsByOppId = {
      d1: [
        { id: 'plenka', opportunityId: 'd1', tip: 'PLENKA', name: 'Plenka' },
        { id: 'banner', opportunityId: 'd1', tip: 'BANNERA', name: 'Banner' },
      ],
    };
    const result = filterDealsAndLineItems({
      deals: [{ id: 'd1', name: 'Mixed deal' }],
      lineItemsByOppId,
      clauses: [{ id: '1', level: 'lineItem', field: 'tip', operator: 'in', value: ['PLENKA'] }],
      showAllPositionOppIds: new Set(),
    });
    const allDealLineItems = lineItemsByOppId.d1 ?? [];

    expect(result.lineItemsByOppId.d1.map((i) => i.tip)).toEqual(['PLENKA']);
    expect(allDealLineItems.some((item) => item.tip === 'BANNERA')).toBe(true);
  });

  it('returns matchedLineItemIds for matching positions', () => {
    const result = filterDealsAndLineItems({
      deals: [{ id: 'd1', name: 'Deal 1' }],
      lineItemsByOppId: {
        d1: [
          { id: 'a', opportunityId: 'd1', stage: 'GOTOVO', name: 'A' },
          { id: 'b', opportunityId: 'd1', stage: 'NOVYY', name: 'B' },
        ],
      },
      clauses: [{ id: '1', level: 'lineItem', field: 'stage', operator: 'in', value: ['GOTOVO'] }],
      showAllPositionOppIds: new Set(),
    });
    expect(result.matchedLineItemIds).toEqual(new Set(['a']));
  });
});
