import type { FilterClause } from './types';

export const getEffectiveClauses = (
  viewClauses: FilterClause[],
  sessionClauses?: FilterClause[],
): FilterClause[] => (sessionClauses === undefined ? viewClauses : sessionClauses);

export const beginSessionClauses = (viewClauses: FilterClause[]): FilterClause[] =>
  structuredClone(viewClauses);

export const commitSessionClauses = (
  clauses: FilterClause[],
): FilterClause[] | undefined => (clauses.length === 0 ? undefined : clauses);

export const resetSession = <T extends { sessionClauses?: FilterClause[] }>(state: T): T => ({
  ...state,
  sessionClauses: undefined,
});
