import type { FilterClause, FilterState } from '../filter-model/types';
import { getEffectiveClauses } from '../filter-model/session';
import type { DealBoardFilters } from '../types';

export const countActiveQuickFilters = (
  filterSession: Partial<FilterState>,
  viewFilters: DealBoardFilters,
  viewClauses: FilterClause[],
): number => {
  let count = 0;

  const datePreset = filterSession.datePreset ?? viewFilters.datePreset;
  if (datePreset) {
    count += 1;
  }

  const effectiveClauses = getEffectiveClauses(viewClauses, filterSession.sessionClauses);
  const clauseGroups = new Set(
    effectiveClauses.map((clause) => `${clause.level}:${clause.field}`),
  );
  count += clauseGroups.size;

  const search = (filterSession.search ?? viewFilters.search ?? '').trim();
  if (search.length > 0) {
    count += 1;
  }

  return count;
};
