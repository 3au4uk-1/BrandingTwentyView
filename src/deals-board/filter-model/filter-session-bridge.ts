import type { QuickFiltersValue } from '../QuickFiltersBar';
import type { DealBoardFilters } from '../types';

import { clausesToDealBoardFilters } from './clauses-to-deal-board-filters';
import { migrateLegacyFilters } from './migrate-legacy-filters';
import { resolveSessionOverride } from './resolve-session-override';
import { getEffectiveClauses } from './session';
import type { FilterClause, FilterState } from './types';

export const filterSessionToQuickFilters = (
  filterSession: Partial<FilterState>,
  viewFilters: DealBoardFilters,
  viewClauses: FilterClause[],
): QuickFiltersValue => {
  const effectiveClauses = getEffectiveClauses(viewClauses, filterSession.sessionClauses);
  const sessionSearchTerms = resolveSessionOverride(
    filterSession.searchTerms,
    viewFilters.searchTerms,
  );
  const boardFilters = clausesToDealBoardFilters(
    effectiveClauses,
    resolveSessionOverride(filterSession.datePreset, viewFilters.datePreset),
    resolveSessionOverride(filterSession.dateFrom, viewFilters.dateFrom),
    resolveSessionOverride(filterSession.dateTo, viewFilters.dateTo),
    sessionSearchTerms !== undefined
      ? undefined
      : resolveSessionOverride(filterSession.search, viewFilters.search),
    sessionSearchTerms,
  );
  const rawPreset =
    resolveSessionOverride(filterSession.datePreset, viewFilters.datePreset) ?? null;

  return {
    datePreset: rawPreset === 'future' ? null : (rawPreset as QuickFiltersValue['datePreset']),
    dateFrom: resolveSessionOverride(filterSession.dateFrom, viewFilters.dateFrom),
    dateTo: resolveSessionOverride(filterSession.dateTo, viewFilters.dateTo),
    stages: boardFilters.stages ?? [],
    types: boardFilters.types ?? [],
    companyIds: boardFilters.companyIds ?? [],
    oplata: (boardFilters.oplata ?? 'all') as QuickFiltersValue['oplata'],
    search: filterSession.search ?? viewFilters.search ?? '',
  };
};

export const quickFiltersToFilterSession = (
  next: QuickFiltersValue,
): Partial<FilterState> => {
  const sessionClauses = migrateLegacyFilters({
    stages: next.stages,
    types: next.types,
    companyIds: next.companyIds,
    oplata: next.oplata,
  });

  return {
    datePreset: next.datePreset ?? undefined,
    dateFrom: next.dateFrom,
    dateTo: next.dateTo,
    search: next.search,
    ...(sessionClauses.length > 0 ? { sessionClauses } : {}),
  };
};

export const buildPersistedFiltersFromSession = (
  viewFilters: DealBoardFilters,
  filterSession: Partial<FilterState>,
  effectiveClauses: FilterClause[],
): DealBoardFilters & { clauses: FilterClause[] } =>
  buildPersistedViewFilters(viewFilters, {
    datePreset: resolveSessionOverride(filterSession.datePreset, viewFilters.datePreset),
    dateFrom: resolveSessionOverride(filterSession.dateFrom, viewFilters.dateFrom),
    dateTo: resolveSessionOverride(filterSession.dateTo, viewFilters.dateTo),
    search: resolveSessionOverride(filterSession.search, viewFilters.search),
    searchTerms: resolveSessionOverride(filterSession.searchTerms, viewFilters.searchTerms),
    clauses: effectiveClauses,
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
    searchTerms: overrides.searchTerms ?? viewFilters.searchTerms,
    showAll: overrides.showAll ?? viewFilters.showAll,
    clauses: overrides.clauses ?? clauses,
  };
};
