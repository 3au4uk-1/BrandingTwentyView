import type { QuickFiltersValue } from '../QuickFiltersBar';
import type { DealBoardFilters } from '../types';

import { clausesToDealBoardFilters } from './clauses-to-deal-board-filters';
import { migrateLegacyFilters } from './migrate-legacy-filters';
import { getEffectiveClauses } from './session';
import type { FilterClause, FilterState } from './types';

export const filterSessionToQuickFilters = (
  filterSession: Partial<FilterState>,
  viewFilters: DealBoardFilters,
  viewClauses: FilterClause[],
): QuickFiltersValue => {
  const effectiveClauses = getEffectiveClauses(viewClauses, filterSession.sessionClauses);
  const boardFilters = clausesToDealBoardFilters(
    effectiveClauses,
    filterSession.datePreset ?? viewFilters.datePreset,
    filterSession.dateFrom ?? viewFilters.dateFrom,
    filterSession.dateTo ?? viewFilters.dateTo,
    filterSession.search ?? viewFilters.search,
  );
  const rawPreset = filterSession.datePreset ?? viewFilters.datePreset ?? null;

  return {
    datePreset: rawPreset === 'future' ? null : (rawPreset as QuickFiltersValue['datePreset']),
    dateFrom: filterSession.dateFrom ?? viewFilters.dateFrom,
    dateTo: filterSession.dateTo ?? viewFilters.dateTo,
    stages: boardFilters.stages ?? [],
    types: boardFilters.types ?? [],
    companyIds: boardFilters.companyIds ?? [],
    oplata: (boardFilters.oplata ?? 'all') as QuickFiltersValue['oplata'],
    search: filterSession.search ?? viewFilters.search ?? '',
  };
};

export const quickFiltersToFilterSession = (
  next: QuickFiltersValue,
): Partial<FilterState> => ({
  datePreset: next.datePreset ?? undefined,
  dateFrom: next.dateFrom,
  dateTo: next.dateTo,
  search: next.search,
  sessionClauses: migrateLegacyFilters({
    stages: next.stages,
    types: next.types,
    companyIds: next.companyIds,
    oplata: next.oplata,
  }),
});

export const buildPersistedViewFilters = (
  viewFilters: DealBoardFilters,
  overrides: Partial<DealBoardFilters & { clauses?: FilterClause[] }> = {},
): DealBoardFilters & { clauses: FilterClause[] } => {
  const clauses = viewFilters.clauses?.length
    ? viewFilters.clauses
    : migrateLegacyFilters(viewFilters);

  return {
    datePreset: overrides.datePreset ?? viewFilters.datePreset,
    dateFrom: overrides.dateFrom ?? viewFilters.dateFrom,
    dateTo: overrides.dateTo ?? viewFilters.dateTo,
    search: overrides.search ?? viewFilters.search,
    showAll: overrides.showAll ?? viewFilters.showAll,
    clauses: overrides.clauses ?? clauses,
  };
};
