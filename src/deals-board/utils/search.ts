import type { DealBoardFilters, LineItemRow, OpportunityRow } from '../types';

import { buildOpportunityDateFilter } from './date-filters';

export const normalizeSearchTerm = (search?: string): string => search?.trim() ?? '';

export const buildOpportunitySearchClause = (
  search: string,
  lineItemMatchedOpportunityIds?: string[],
): Record<string, unknown> => {
  const nameFilter = { name: { ilike: `%${search}%` } };
  const matchingIds = lineItemMatchedOpportunityIds?.filter(Boolean) ?? [];
  if (matchingIds.length === 0) {
    return nameFilter;
  }
  return { or: [nameFilter, { id: { in: matchingIds } }] };
};

export const buildOpportunityFilter = (
  filters: DealBoardFilters,
  lineItemMatchedOpportunityIds?: string[],
): { and: Record<string, unknown>[] } | undefined => {
  const and: Record<string, unknown>[] = [];
  const dateFilter = buildOpportunityDateFilter(filters);
  if (dateFilter) and.push(dateFilter);

  const search = normalizeSearchTerm(filters.search);
  if (search) {
    and.push(buildOpportunitySearchClause(search, lineItemMatchedOpportunityIds));
  }

  return and.length ? { and } : undefined;
};

export const opportunityMatchesSearch = (
  opportunity: Pick<OpportunityRow, 'name'>,
  search: string,
): boolean => {
  const normalized = normalizeSearchTerm(search).toLowerCase();
  if (!normalized) return true;
  return opportunity.name.toLowerCase().includes(normalized);
};

export const lineItemMatchesSearch = (
  item: Pick<LineItemRow, 'name' | 'kommentariy'>,
  search: string,
): boolean => {
  const normalized = normalizeSearchTerm(search).toLowerCase();
  if (!normalized) return true;
  if (item.name.toLowerCase().includes(normalized)) return true;
  if (typeof item.kommentariy === 'string' && item.kommentariy.toLowerCase().includes(normalized)) {
    return true;
  }
  return false;
};

export const filterLineItemsForSearch = (
  lineItems: LineItemRow[],
  search: string,
  recordsById: Map<string, OpportunityRow>,
): LineItemRow[] => {
  const normalized = normalizeSearchTerm(search);
  if (!normalized) return lineItems;

  return lineItems.filter((item) => {
    const opportunity = recordsById.get(item.opportunityId);
    if (opportunity && opportunityMatchesSearch(opportunity, normalized)) {
      return true;
    }
    return lineItemMatchesSearch(item, normalized);
  });
};
