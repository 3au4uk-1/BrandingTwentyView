import type { LineItemRow, OpportunityRow } from '../types';

import type { FilterClause } from './types';

export type FilterDealsAndLineItemsParams = {
  deals: OpportunityRow[];
  lineItemsByOppId: Record<string, LineItemRow[]>;
  clauses: FilterClause[];
  showAllPositionOppIds: Set<string>;
};

export type FilterDealsAndLineItemsResult = {
  deals: OpportunityRow[];
  lineItemsByOppId: Record<string, LineItemRow[]>;
  matchedLineItemIds?: Set<string>;
};

const getLineItemClauses = (clauses: FilterClause[]): FilterClause[] =>
  clauses.filter((clause) => clause.level === 'lineItem');

const matchesInClause = (fieldValue: unknown, values: unknown): boolean => {
  const allowed = Array.isArray(values) ? values.filter(Boolean) : [];
  if (allowed.length === 0) {
    return true;
  }
  return typeof fieldValue === 'string' && allowed.includes(fieldValue);
};

const matchesLineItemClause = (item: LineItemRow, clause: FilterClause): boolean => {
  if (clause.operator === 'in') {
    return matchesInClause(item[clause.field], clause.value);
  }
  return true;
};

const matchesAllClauses = <T extends OpportunityRow | LineItemRow>(
  row: T,
  clauses: FilterClause[],
  matcher: (row: T, clause: FilterClause) => boolean,
): boolean => clauses.every((clause) => matcher(row, clause));

export const filterDealsAndLineItems = ({
  deals,
  lineItemsByOppId,
  clauses,
  showAllPositionOppIds,
}: FilterDealsAndLineItemsParams): FilterDealsAndLineItemsResult => {
  const lineItemClauses = getLineItemClauses(clauses);
  const hasLineItemClauses = lineItemClauses.length > 0;

  const nextLineItemsByOppId: Record<string, LineItemRow[]> = {};
  const matchedLineItemIds = hasLineItemClauses ? new Set<string>() : undefined;
  const keptDeals: OpportunityRow[] = [];

  for (const deal of deals) {
    const lineItems = lineItemsByOppId[deal.id] ?? [];

    if (!hasLineItemClauses) {
      keptDeals.push(deal);
      nextLineItemsByOppId[deal.id] = lineItems;
      continue;
    }

    const matchingItems = lineItems.filter((item) =>
      matchesAllClauses(item, lineItemClauses, matchesLineItemClause),
    );

    if (matchingItems.length === 0) {
      continue;
    }

    keptDeals.push(deal);
    for (const item of matchingItems) {
      matchedLineItemIds?.add(item.id);
    }

    nextLineItemsByOppId[deal.id] = showAllPositionOppIds.has(deal.id)
      ? lineItems
      : matchingItems;
  }

  return {
    deals: keptDeals,
    lineItemsByOppId: nextLineItemsByOppId,
    matchedLineItemIds,
  };
};
