import type { FilterState } from './types';

/**
 * Explicit session overrides that wipe view defaults (date, clauses, search).
 * Unlike `{}`, this does not fall back to the saved view's filters.
 * Prefer `RESET_FILTER_SESSION_TO_VIEW` for the toolbar «Сбросить» action.
 */
export const CLEAR_FILTER_SESSION: Partial<FilterState> = {
  datePreset: null,
  dateFrom: undefined,
  dateTo: undefined,
  search: '',
  searchTerms: [],
  sessionClauses: [],
};

/**
 * Drop all session overrides so effective filters fall back to the active view.
 */
export const RESET_FILTER_SESSION_TO_VIEW: Partial<FilterState> = {};

/** True when the user has session overrides on top of the saved view. */
export const hasFilterSessionOverrides = (
  filterSession: Partial<FilterState> | null | undefined,
): boolean => {
  if (!filterSession) return false;
  return (
    filterSession.datePreset !== undefined ||
    filterSession.dateFrom !== undefined ||
    filterSession.dateTo !== undefined ||
    filterSession.search !== undefined ||
    filterSession.searchTerms !== undefined ||
    filterSession.sessionClauses !== undefined
  );
};
