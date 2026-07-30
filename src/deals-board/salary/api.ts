import { RestApiClient } from 'twenty-client-sdk/rest';

import type { LineItemRow, OpportunityRow } from '../types';
import { extractRestPageInfo, normalizeRestListResponse } from '../api/rest-list';
import { enrichOpportunityRowsWithRestFields } from '../api/opportunity-link-fields-rest';
import { asArray } from '../utils/parse-json-field';

const PAGE_LIMIT = 200;

const normalizeLineItem = (raw: unknown): LineItemRow | null => {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  if (typeof item.id !== 'string') return null;
  const opportunityId =
    typeof item.opportunityId === 'string'
      ? item.opportunityId
      : item.opportunity && typeof item.opportunity === 'object'
        ? String((item.opportunity as { id?: string }).id ?? '')
        : '';
  if (!opportunityId) return null;
  return {
    ...(item as LineItemRow),
    id: item.id,
    name: typeof item.name === 'string' ? item.name : '',
    opportunityId,
  };
};

/** PLENKA + NASHI + OKLEYKA|GOTOVO — salary export source. */
export const fetchOkleykaSalaryLineItems = async (): Promise<LineItemRow[]> => {
  const client = new RestApiClient();
  const filter =
    'and(tip[eq]:"PLENKA",tipDetail[eq]:"NASHI",stage[in]:["OKLEYKA","GOTOVO"])';
  const all: LineItemRow[] = [];
  let after: string | undefined;

  do {
    const response = await client.get<unknown>('/rest/dealLineItems', {
      query: {
        filter,
        limit: PAGE_LIMIT,
        ...(after ? { after } : {}),
      },
    });
    const page = normalizeRestListResponse<unknown>(response, 'dealLineItems')
      .map(normalizeLineItem)
      .filter((row): row is LineItemRow => row !== null);
    all.push(...page);
    const pageInfo = extractRestPageInfo(response);
    after =
      pageInfo.hasNextPage && pageInfo.endCursor ? String(pageInfo.endCursor) : undefined;
  } while (after);

  return all;
};

/**
 * Load deal name + Bitrix link for salary rows.
 * Use REST (not GraphQL): app Core GraphQL often omits workspace LINKS fields
 * (`bitrixLink` / `tonyLink`) even when metadata has them — same pattern as the board.
 */
export const fetchOpportunitiesByIdsForSalary = async (
  ids: string[],
): Promise<OpportunityRow[]> => {
  if (ids.length === 0) return [];
  const stubs: OpportunityRow[] = [...new Set(ids)].map((id) => ({ id, name: '' }));
  return enrichOpportunityRowsWithRestFields(stubs, ['name', 'bitrixLink']);
};
