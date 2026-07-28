import { describe, expect, it } from 'vitest';

import { toggleInClauseValue } from './toggle-in-clause';
import type { FilterClause } from './types';

describe('toggleInClauseValue', () => {
  it('adds a new in-clause when field is absent', () => {
    const next = toggleInClauseValue([], 'lineItem', 'tip', 'BANNERA');
    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({
      level: 'lineItem',
      field: 'tip',
      operator: 'in',
      value: ['BANNERA'],
    });
  });

  it('toggles a value off and removes the clause when empty', () => {
    const clauses: FilterClause[] = [
      {
        id: 'c1',
        level: 'lineItem',
        field: 'stage',
        operator: 'in',
        value: ['NOVYY'],
      },
    ];
    expect(toggleInClauseValue(clauses, 'lineItem', 'stage', 'NOVYY')).toEqual([]);
  });

  it('adds a second value to an existing clause', () => {
    const clauses: FilterClause[] = [
      {
        id: 'c1',
        level: 'lineItem',
        field: 'tip',
        operator: 'in',
        value: ['BANNERA'],
      },
    ];
    const next = toggleInClauseValue(clauses, 'lineItem', 'tip', 'PLENKA');
    expect(next[0]?.value).toEqual(['BANNERA', 'PLENKA']);
    expect(next[0]?.id).toBe('c1');
  });
});
