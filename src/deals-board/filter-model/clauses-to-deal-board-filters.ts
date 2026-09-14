import type { DealBoardDatePreset, DealBoardFilters } from '../types';
import { normalizeSearchTerm } from '../utils/search';

import type { FilterClause } from './types';

const collectInValues = (
  clauses: FilterClause[],
  level: FilterClause['level'],
  field: string,
): string[] | undefined => {
  const values = clauses
    .filter((clause) => clause.level === level && clause.field === field && clause.operator === 'in')
    .flatMap((clause) => (Array.isArray(clause.value) ? clause.value : []))
    .filter((value): value is string => typeof value === 'string' && Boolean(value));

  return values.length ? [...new Set(values)] : undefined;
};

const resolveOplata = (clauses: FilterClause[]): DealBoardFilters['oplata'] => {
  const oplataClause = clauses.find(
    (clause) => clause.level === 'deal' && clause.field === 'oplata',
  );
  if (!oplataClause) {
    return 'all';
  }
  if (oplataClause.operator === 'isEmpty') {
    return 'empty';
  }
  if (oplataClause.operator === 'eq' && oplataClause.value === 'filled') {
    return 'filled';
  }
  if (oplataClause.operator === 'eq' && typeof oplataClause.value === 'string') {
    return oplataClause.value;
  }
  return 'all';
};

const resolveAmountMinRub = (clauses: FilterClause[]): number | undefined => {
  const clause = clauses.find(
    (item) => item.level === 'deal' && item.field === 'amount' && item.operator === 'gte',
  );
  return typeof clause?.value === 'number' && Number.isFinite(clause.value) && clause.value >= 0
    ? clause.value
    : undefined;
};

export const clausesToDealBoardFilters = (
  clauses: FilterClause[],
  datePreset?: DealBoardDatePreset | null,
  dateFrom?: string,
  dateTo?: string,
  search?: string,
  searchTerms?: string[],
): DealBoardFilters => {
  const amountMinRub = resolveAmountMinRub(clauses);
  return {
    datePreset: datePreset ?? undefined,
    dateFrom,
    dateTo,
    search: normalizeSearchTerm(search) || undefined,
    searchTerms: searchTerms?.length ? searchTerms : undefined,
    stages: undefined,
    opportunityStages: collectInValues(clauses, 'deal', 'stage') as DealBoardFilters['opportunityStages'],
    lineItemStages: collectInValues(clauses, 'lineItem', 'stage') as DealBoardFilters['lineItemStages'],
    types: collectInValues(clauses, 'lineItem', 'tip'),
    companyIds: collectInValues(clauses, 'deal', 'companyId'),
    oplata: resolveOplata(clauses),
    ...(amountMinRub !== undefined ? { amountMinRub } : {}),
  };
};
