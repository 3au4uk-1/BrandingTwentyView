import type { FilterState } from './types';

/**
 * Explicit session overrides that wipe view defaults (date, clauses, search).
 * Unlike `{}`, this does not fall back to the saved view's filters.
 */
export const CLEAR_FILTER_SESSION: Partial<FilterState> = {
  datePreset: null,
  dateFrom: undefined,
  dateTo: undefined,
  search: '',
  searchTerms: [],
  sessionClauses: [],
};
