import { describe, expect, it } from 'vitest';

import type { FilterClause } from './types';
import { migrateLegacyFilters } from './migrate-legacy-filters';

describe('migrateLegacyFilters', () => {
  it('maps stages to lineItem in-clause', () => {
    expect(migrateLegacyFilters({ stages: ['NOVYY', 'GOTOVO'] })).toEqual([
      expect.objectContaining({
        level: 'lineItem',
        field: 'stage',
        operator: 'in',
        value: ['NOVYY', 'GOTOVO'],
      }),
    ]);
  });

  it('maps companyIds to deal in-clause', () => {
    expect(migrateLegacyFilters({ companyIds: ['c1'] })[0]).toMatchObject({
      level: 'deal',
      field: 'companyId',
      operator: 'in',
      value: ['c1'],
    });
  });

  it('maps types to lineItem tip in-clause', () => {
    expect(migrateLegacyFilters({ types: ['BANNERA', 'PLENKA'] })[0]).toMatchObject({
      level: 'lineItem',
      field: 'tip',
      operator: 'in',
      value: ['BANNERA', 'PLENKA'],
    });
  });

  it('maps oplata filled to deal eq-clause', () => {
    expect(migrateLegacyFilters({ oplata: 'filled' })[0]).toMatchObject({
      level: 'deal',
      field: 'oplata',
      operator: 'eq',
      value: 'filled',
    });
  });

  it('maps oplata empty to deal isEmpty-clause', () => {
    expect(migrateLegacyFilters({ oplata: 'empty' })[0]).toMatchObject({
      level: 'deal',
      field: 'oplata',
      operator: 'isEmpty',
    });
  });

  it('ignores oplata when all', () => {
    expect(migrateLegacyFilters({ oplata: 'all' })).toEqual([]);
  });

  it('returns existing clauses when non-empty and ignores legacy arrays', () => {
    const existing: FilterClause[] = [
      { id: 'keep-me', level: 'deal', field: 'oplata', operator: 'eq', value: 'x' },
    ];
    expect(
      migrateLegacyFilters({
        clauses: existing,
        stages: ['NOVYY'],
        companyIds: ['c1'],
        types: ['BANNERA'],
        oplata: 'filled',
      }),
    ).toEqual(existing);
  });

  it('migrates legacy when clauses is empty', () => {
    const result = migrateLegacyFilters({ clauses: [], stages: ['NOVYY'] });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      level: 'lineItem',
      field: 'stage',
      operator: 'in',
      value: ['NOVYY'],
    });
  });

  it('generates unique ids for migrated clauses', () => {
    const result = migrateLegacyFilters({
      stages: ['NOVYY'],
      companyIds: ['c1'],
    });
    expect(result).toHaveLength(2);
    expect(result[0].id).toBeTruthy();
    expect(result[1].id).toBeTruthy();
    expect(result[0].id).not.toBe(result[1].id);
  });
});
