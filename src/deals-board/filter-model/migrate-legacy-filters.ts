import type { DealBoardFilters } from '../types';

import type { FilterClause } from './types';

type LegacyFilters = DealBoardFilters & { clauses?: FilterClause[] };

const newClauseId = (): string => crypto.randomUUID();

const pushInClause = (
  clauses: FilterClause[],
  level: FilterClause['level'],
  field: string,
  value: unknown,
): void => {
  const values = Array.isArray(value) ? value.filter(Boolean) : [];
  if (values.length === 0) {
    return;
  }
  clauses.push({
    id: newClauseId(),
    level,
    field,
    operator: 'in',
    value: values,
  });
};

const pushOplataClause = (clauses: FilterClause[], oplata: string): void => {
  if (!oplata || oplata === 'all') {
    return;
  }
  if (oplata === 'empty') {
    clauses.push({
      id: newClauseId(),
      level: 'deal',
      field: 'oplata',
      operator: 'isEmpty',
      value: undefined,
    });
    return;
  }
  clauses.push({
    id: newClauseId(),
    level: 'deal',
    field: 'oplata',
    operator: 'eq',
    value: oplata,
  });
};

export const migrateLegacyFilters = (filters: LegacyFilters): FilterClause[] => {
  if (filters.clauses?.length) {
    return filters.clauses;
  }

  const clauses: FilterClause[] = [];

  pushInClause(clauses, 'lineItem', 'stage', filters.stages);
  pushInClause(clauses, 'lineItem', 'tip', filters.types);
  pushInClause(clauses, 'deal', 'companyId', filters.companyIds);

  if (filters.oplata) {
    pushOplataClause(clauses, filters.oplata);
  }

  return clauses;
};
