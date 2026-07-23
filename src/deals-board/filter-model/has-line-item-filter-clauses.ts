import type { FilterClause } from './types';

export const hasLineItemFilterClauses = (clauses: FilterClause[]): boolean =>
  clauses.some((clause) => clause.level === 'lineItem');
