import { RestApiClient } from 'twenty-client-sdk/rest';

import { fetchOpportunities } from '../api/opportunities';
import { updateLineItem } from '../api/line-items';
import { extractRestPageInfo, normalizeRestListResponse } from '../api/rest-list';
import { enrichOpportunityRowsWithRestFields } from '../api/opportunity-link-fields-rest';
import type { DealBoardFilters, LineItemRow, OpportunityRow } from '../types';
import { opportunityMatchesDateFilter } from '../utils/resolve-opportunity-date';
import { buildOkleykaSalaryRows, type OkleykaSalaryRow } from './compute';

const PAGE_LIMIT = 200;
const ID_CHUNK = 50;

const chunkIds = (ids: string[]): string[][] => {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += ID_CHUNK) out.push(ids.slice(i, i + ID_CHUNK));
  return out;
};

export const buildOkleykaSalaryLineItemsFilter = (opportunityIds: string[]): string =>
  `and(opportunityId[in]:${JSON.stringify(opportunityIds)},tip[eq]:"PLENKA",tipDetail[eq]:"NASHI",stage[in]:["OKLEYKA","GOTOVO"])`;

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

const fetchOkleykaLineItemsForOpportunityIds = async (
  opportunityIds: string[],
): Promise<LineItemRow[]> => {
  if (opportunityIds.length === 0) return [];

  const client = new RestApiClient();
  const all: LineItemRow[] = [];

  for (const chunk of chunkIds(opportunityIds)) {
    const filter = buildOkleykaSalaryLineItemsFilter(chunk);
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
  }

  return all;
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

export const fetchOkleykaSalaryPageData = async (
  dateFrom: string,
  dateTo: string,
): Promise<OkleykaSalaryRow[]> => {
  const filters: DealBoardFilters = { datePreset: 'custom', dateFrom, dateTo };

  const { records } = await fetchOpportunities({
    limit: PAGE_LIMIT,
    offset: 0,
    sort: [],
    filters,
    visibleCrmFieldNames: ['loadDate'],
    restFieldNames: ['name', 'bitrixLink', 'loadDate', 'closeDate'],
    includeCompanyRelation: false,
    fetchAll: true,
  });

  if (records.length === 0) return [];

  const opportunityIds = records
    .map((record) => (typeof record.id === 'string' ? record.id : ''))
    .filter(Boolean);
  const lineItems = await fetchOkleykaLineItemsForOpportunityIds(opportunityIds);

  const dealsById = new Map<string, OpportunityRow>();
  for (const deal of records) {
    if (opportunityMatchesDateFilter(deal, filters)) {
      dealsById.set(deal.id, deal);
    }
  }

  const matchedLineItems = lineItems.filter((item) => dealsById.has(item.opportunityId));
  return buildOkleykaSalaryRows(matchedLineItems, dealsById);
};

export const patchOkleykaCost = async (
  lineItemId: string,
  rubles: number | null,
): Promise<void> => {
  if (rubles === null) {
    await updateLineItem(lineItemId, { stoimostOkleyki: null });
    return;
  }

  await updateLineItem(lineItemId, {
    stoimostOkleyki: {
      amountMicros: Math.round(rubles * 1_000_000),
      currencyCode: 'RUB',
    },
  });
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
