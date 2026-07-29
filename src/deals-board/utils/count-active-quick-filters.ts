import { resolveSessionOverride } from '../filter-model/resolve-session-override';
import type { FilterClause, FilterState } from '../filter-model/types';
import { getEffectiveClauses } from '../filter-model/session';
import type { DealBoardFilters } from '../types';
import { resolveSearchTerms } from './search';

export const countActiveQuickFilters = (
  filterSession: Partial<FilterState>,
  viewFilters: DealBoardFilters,
  viewClauses: FilterClause[],
): number => {
  let count = 0;

  const datePreset = resolveSessionOverride(filterSession.datePreset, viewFilters.datePreset);
  if (datePreset) {
    count += 1;
  }

  const effectiveClauses = getEffectiveClauses(viewClauses, filterSession.sessionClauses);
  const clauseGroups = new Set(
    effectiveClauses.map((clause) => `${clause.level}:${clause.field}`),
  );
  count += clauseGroups.size;

  const searchTerms = resolveSearchTerms({
    search:
      filterSession.searchTerms !== undefined
        ? undefined
        : (filterSession.search ?? viewFilters.search),
    searchTerms: resolveSessionOverride(filterSession.searchTerms, viewFilters.searchTerms),
  });
  if (searchTerms.length > 0) {
    count += 1;
  }

  return count;
};
