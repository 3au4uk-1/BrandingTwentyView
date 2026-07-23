import type { DealBoardDatePreset } from '../types';

export type FilterOperator = 'eq' | 'in' | 'contains' | 'between' | 'isEmpty';

export type FilterClause = {
  id: string;
  level: 'deal' | 'lineItem';
  field: string;
  operator: FilterOperator;
  value: unknown;
};

export type FilterState = {
  datePreset?: DealBoardDatePreset;
  dateFrom?: string;
  dateTo?: string;
  clauses: FilterClause[];
  sessionClauses?: FilterClause[];
  search?: string;
};
