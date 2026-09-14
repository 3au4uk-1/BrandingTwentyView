import type { DealBoardDatePreset } from '../types';

export type FilterOperator = 'eq' | 'in' | 'contains' | 'between' | 'isEmpty' | 'gte';

export type FilterClause = {
  id: string;
  level: 'deal' | 'lineItem';
  field: string;
  operator: FilterOperator;
  value: unknown;
};

export type FilterState = {
  /** `null` = explicitly cleared (do not fall back to saved view). */
  datePreset?: DealBoardDatePreset | null;
  dateFrom?: string;
  dateTo?: string;
  clauses: FilterClause[];
  sessionClauses?: FilterClause[];
  /** Draft text in the search input (before Enter). */
  search?: string;
  /** Active keyword chips; OR-matched against deals/positions. */
  searchTerms?: string[];
};
