import { describe, expect, it } from 'vitest';

import type { FilterClause, FilterState } from './types';
import { beginSessionClauses, getEffectiveClauses, resetSession } from './session';

const clause = (
  id: string,
  value: unknown,
  overrides: Partial<FilterClause> = {},
): FilterClause => ({
  id,
  level: 'deal',
  field: 'oplata',
  operator: 'eq',
  value,
  ...overrides,
});

describe('getEffectiveClauses', () => {
  it('uses view clauses when session undefined', () => {
    expect(
      getEffectiveClauses(
        [{ id: '1', level: 'deal', field: 'oplata', operator: 'eq', value: 'x' }],
        undefined,
      ),
    ).toHaveLength(1);
  });

  it('copy-on-write: session replaces view for effective', () => {
    const view = [{ id: '1', level: 'deal', field: 'oplata', operator: 'eq', value: 'a' }];
    const session = [{ id: '1', level: 'deal', field: 'oplata', operator: 'eq', value: 'b' }];
    expect(getEffectiveClauses(view, session)[0].value).toBe('b');
  });
});

describe('beginSessionClauses', () => {
  it('clones view clauses with the same ids', () => {
    const view = [clause('a', '1'), clause('b', '2')];
    const session = beginSessionClauses(view);
    expect(session).toEqual(view);
    expect(session).not.toBe(view);
    expect(session[0]).not.toBe(view[0]);
  });
});

describe('resetSession', () => {
  it('clears sessionClauses while preserving other state', () => {
    const state: FilterState = {
      datePreset: 'today',
      clauses: [clause('view', 'v')],
      sessionClauses: [clause('session', 's')],
      search: 'q',
    };
    expect(resetSession(state)).toEqual({
      datePreset: 'today',
      clauses: state.clauses,
      sessionClauses: undefined,
      search: 'q',
    });
  });
});
