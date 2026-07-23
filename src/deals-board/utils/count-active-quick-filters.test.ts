import { describe, expect, it } from 'vitest';

import type { FilterClause } from '../filter-model/types';
import { countActiveQuickFilters } from './count-active-quick-filters';

const VIEW_CLAUSES: FilterClause[] = [
  { id: '1', level: 'lineItem', field: 'stage', operator: 'in', value: ['GOTOVO'] },
];

describe('countActiveQuickFilters', () => {
  it('returns 0 for empty session and view', () => {
    expect(countActiveQuickFilters({}, {}, [])).toBe(0);
  });

  it('counts date preset, clause groups, and search', () => {
    expect(
      countActiveQuickFilters(
        {
          datePreset: 'today',
          search: 'test',
          sessionClauses: [
            { id: '1', level: 'lineItem', field: 'stage', operator: 'in', value: ['GOTOVO'] },
            { id: '2', level: 'lineItem', field: 'tip', operator: 'in', value: ['BANNERA'] },
            { id: '3', level: 'deal', field: 'companyId', operator: 'in', value: ['c1'] },
          ],
        },
        {},
        [],
      ),
    ).toBe(5);
  });

  it('uses view clauses when session is undefined', () => {
    expect(
      countActiveQuickFilters(
        { search: 'deal' },
        { datePreset: 'week' },
        VIEW_CLAUSES,
      ),
    ).toBe(3);
  });

  it('ignores whitespace-only search', () => {
    expect(countActiveQuickFilters({ search: '   ' }, {}, [])).toBe(0);
  });
});
