import { describe, expect, it } from 'vitest';

import type { QuickFiltersValue } from '../QuickFiltersBar';

import {
  buildPersistedFiltersFromSession,
  quickFiltersToFilterSession,
} from './filter-session-bridge';
import { getEffectiveClauses } from './session';
import type { FilterClause } from './types';

const VIEW_CLAUSES: FilterClause[] = [
  { id: '1', level: 'lineItem', field: 'stage', operator: 'in', value: ['GOTOVO'] },
];

const emptyQuickFilters = (): QuickFiltersValue => ({
  datePreset: null,
  dateFrom: undefined,
  dateTo: undefined,
  stages: [],
  types: [],
  companyIds: [],
  oplata: 'all',
  search: '',
});

describe('quickFiltersToFilterSession', () => {
  it('omits sessionClauses when mobile clears clause fields', () => {
    const session = quickFiltersToFilterSession(emptyQuickFilters());

    expect(session.sessionClauses).toBeUndefined();
    expect(getEffectiveClauses(VIEW_CLAUSES, session.sessionClauses)).toEqual(VIEW_CLAUSES);
  });

  it('sets sessionClauses when mobile has clause filters', () => {
    const session = quickFiltersToFilterSession({
      ...emptyQuickFilters(),
      stages: ['GOTOVO'],
    });

    expect(session.sessionClauses).toHaveLength(1);
    expect(session.sessionClauses?.[0]?.field).toBe('stage');
  });
});

describe('buildPersistedFiltersFromSession', () => {
  it('persists session overrides and effective clauses', () => {
    const clauses: FilterClause[] = [
      { id: '2', level: 'lineItem', field: 'tip', operator: 'in', value: ['BANNERA'] },
    ];

    expect(
      buildPersistedFiltersFromSession(
        { datePreset: 'week', search: 'old' },
        { datePreset: 'today', search: 'new' },
        clauses,
      ),
    ).toEqual({
      datePreset: 'today',
      dateFrom: undefined,
      dateTo: undefined,
      search: 'new',
      showAll: undefined,
      clauses,
    });
  });
});
