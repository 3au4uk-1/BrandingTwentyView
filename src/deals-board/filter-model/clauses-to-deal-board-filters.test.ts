import { describe, expect, it } from 'vitest';

import type { FilterClause } from './types';
import { clausesToDealBoardFilters } from './clauses-to-deal-board-filters';

describe('clausesToDealBoardFilters', () => {
  it('maps lineItem stage in-clause to lineItemStages', () => {
    const clauses: FilterClause[] = [
      { id: '1', level: 'lineItem', field: 'stage', operator: 'in', value: ['NOVYY', 'GOTOVO'] },
    ];
    expect(clausesToDealBoardFilters(clauses)).toEqual({
      opportunityStages: undefined,
      lineItemStages: ['NOVYY', 'GOTOVO'],
      stages: undefined,
      types: undefined,
      companyIds: undefined,
      oplata: 'all',
    });
  });

  it('maps deal stage in-clause to opportunityStages', () => {
    const clauses: FilterClause[] = [
      { id: '1', level: 'deal', field: 'stage', operator: 'in', value: ['V_RABOTE', 'OTCHET_STAS'] },
    ];
    expect(clausesToDealBoardFilters(clauses)).toEqual({
      opportunityStages: ['V_RABOTE', 'OTCHET_STAS'],
      lineItemStages: undefined,
      stages: undefined,
      types: undefined,
      companyIds: undefined,
      oplata: 'all',
    });
  });

  it('maps lineItem tip in-clause to types', () => {
    const clauses: FilterClause[] = [
      { id: '1', level: 'lineItem', field: 'tip', operator: 'in', value: ['BANNERA', 'PLENKA'] },
    ];
    expect(clausesToDealBoardFilters(clauses)).toEqual({
      opportunityStages: undefined,
      lineItemStages: undefined,
      stages: undefined,
      types: ['BANNERA', 'PLENKA'],
      companyIds: undefined,
      oplata: 'all',
    });
  });

  it('maps deal companyId in-clause to companyIds', () => {
    const clauses: FilterClause[] = [
      { id: '1', level: 'deal', field: 'companyId', operator: 'in', value: ['c1', 'c2'] },
    ];
    expect(clausesToDealBoardFilters(clauses)).toEqual({
      opportunityStages: undefined,
      lineItemStages: undefined,
      stages: undefined,
      types: undefined,
      companyIds: ['c1', 'c2'],
      oplata: 'all',
    });
  });

  it('maps deal oplata eq filled to oplata filled', () => {
    const clauses: FilterClause[] = [
      { id: '1', level: 'deal', field: 'oplata', operator: 'eq', value: 'filled' },
    ];
    expect(clausesToDealBoardFilters(clauses)).toEqual({
      opportunityStages: undefined,
      lineItemStages: undefined,
      stages: undefined,
      types: undefined,
      companyIds: undefined,
      oplata: 'filled',
    });
  });

  it('maps deal oplata isEmpty to oplata empty', () => {
    const clauses: FilterClause[] = [
      { id: '1', level: 'deal', field: 'oplata', operator: 'isEmpty', value: undefined },
    ];
    expect(clausesToDealBoardFilters(clauses)).toEqual({
      opportunityStages: undefined,
      lineItemStages: undefined,
      stages: undefined,
      types: undefined,
      companyIds: undefined,
      oplata: 'empty',
    });
  });

  it('defaults oplata to all when no oplata clause', () => {
    expect(clausesToDealBoardFilters([])).toEqual({
      opportunityStages: undefined,
      lineItemStages: undefined,
      stages: undefined,
      types: undefined,
      companyIds: undefined,
      oplata: 'all',
    });
  });

  it('passes through date and search fields', () => {
    const clauses: FilterClause[] = [
      { id: '1', level: 'lineItem', field: 'stage', operator: 'in', value: ['NOVYY'] },
    ];
    expect(
      clausesToDealBoardFilters(clauses, 'week', '2026-07-01', '2026-07-07', '  search  '),
    ).toEqual({
      datePreset: 'week',
      dateFrom: '2026-07-01',
      dateTo: '2026-07-07',
      search: 'search',
      opportunityStages: undefined,
      lineItemStages: ['NOVYY'],
      stages: undefined,
      types: undefined,
      companyIds: undefined,
      oplata: 'all',
    });
  });

  it('does not mutate input clauses', () => {
    const clauses: FilterClause[] = [
      { id: '1', level: 'lineItem', field: 'stage', operator: 'in', value: ['NOVYY'] },
    ];
    const snapshot = structuredClone(clauses);
    clausesToDealBoardFilters(clauses);
    expect(clauses).toEqual(snapshot);
  });
});
