import type { DealBoardFilters, LineItemRow, OpportunityRow } from '../types';

import { rublesToAmountMicros } from '../filter-model/amount-min';
import { buildOpportunityDateFilter } from './date-filters';

export const normalizeSearchTerm = (search?: string): string => search?.trim() ?? '';

/** Unique non-empty search terms used for OR matching. */
export const resolveSearchTerms = (filters: {
  search?: string;
  searchTerms?: string[];
}): string[] => {
  // `searchTerms` set (even `[]`) means chip mode — ignore draft `search`.
  if (filters.searchTerms !== undefined) {
    const fromChips = filters.searchTerms
      .map((term) => normalizeSearchTerm(term))
      .filter(Boolean);
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const term of fromChips) {
      const key = term.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(term);
    }
    return unique;
  }
  const single = normalizeSearchTerm(filters.search);
  return single ? [single] : [];
};

export const addSearchTerm = (terms: string[] | undefined, raw: string): string[] => {
  const next = normalizeSearchTerm(raw);
  if (!next) return terms ?? [];
  const existing = terms ?? [];
  if (existing.some((term) => term.toLowerCase() === next.toLowerCase())) {
    return existing;
  }
  return [...existing, next];
};

export const buildOpportunitySearchClause = (
  search: string | string[],
  lineItemMatchedOpportunityIds?: string[],
): Record<string, unknown> => {
  const terms = (Array.isArray(search) ? search : [search])
    .map((term) => normalizeSearchTerm(term))
    .filter(Boolean);
  const nameFilters = terms.map((term) => ({ name: { ilike: `%${term}%` } }));
  const nameFilter =
    nameFilters.length === 0
      ? null
      : nameFilters.length === 1
        ? nameFilters[0]
        : { or: nameFilters };

  const matchingIds = lineItemMatchedOpportunityIds?.filter(Boolean) ?? [];
  if (!nameFilter) {
    return matchingIds.length > 0 ? { id: { in: matchingIds } } : {};
  }
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

  const terms = resolveSearchTerms(filters);
  if (terms.length > 0) {
    and.push(buildOpportunitySearchClause(terms, lineItemMatchedOpportunityIds));
  }

  const companyIds = filters.companyIds?.filter(Boolean) ?? [];
  if (companyIds.length > 0) {
    and.push({ companyId: { in: companyIds } });
  }

  const opportunityStages = filters.opportunityStages?.filter(Boolean) ?? [];
  if (opportunityStages.length > 0) {
    and.push({ stage: { in: opportunityStages } });
  }

  if (
    typeof filters.amountMinRub === 'number' &&
    Number.isFinite(filters.amountMinRub) &&
    filters.amountMinRub >= 0
  ) {
    and.push({
      amount: { amountMicros: { gte: rublesToAmountMicros(filters.amountMinRub) } },
    });
  }

  if (lineItemMatchedOpportunityIds !== undefined && terms.length === 0) {
    and.push({ id: { in: lineItemMatchedOpportunityIds.filter(Boolean) } });
  }

  return and.length ? { and } : undefined;
};

export const opportunityMatchesSearch = (
  opportunity: Pick<OpportunityRow, 'name'>,
  search: string | string[],
): boolean => {
  const terms = (Array.isArray(search) ? search : [search])
    .map((term) => normalizeSearchTerm(term).toLowerCase())
    .filter(Boolean);
  if (terms.length === 0) return true;
  const name = opportunity.name.toLowerCase();
  return terms.some((term) => name.includes(term));
};

export const lineItemMatchesSearch = (
  item: Pick<LineItemRow, 'name' | 'kommentariy'>,
  search: string | string[],
): boolean => {
  const terms = (Array.isArray(search) ? search : [search])
    .map((term) => normalizeSearchTerm(term).toLowerCase())
    .filter(Boolean);
  if (terms.length === 0) return true;
  const name = item.name.toLowerCase();
  const comment =
    typeof item.kommentariy === 'string' ? item.kommentariy.toLowerCase() : '';
  return terms.some((term) => name.includes(term) || comment.includes(term));
};

export const filterLineItemsForSearch = (
  lineItems: LineItemRow[],
  search: string | string[],
  recordsById: Map<string, OpportunityRow>,
): LineItemRow[] => {
  const terms = (Array.isArray(search) ? search : [search])
    .map((term) => normalizeSearchTerm(term))
    .filter(Boolean);
  if (terms.length === 0) return lineItems;

  return lineItems.filter((item) => {
    const opportunity = recordsById.get(item.opportunityId);
    if (opportunity && opportunityMatchesSearch(opportunity, terms)) {
      return true;
    }
    return lineItemMatchesSearch(item, terms);
  });
};
