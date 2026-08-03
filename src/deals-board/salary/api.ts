import { RestApiClient } from 'twenty-client-sdk/rest';

import { fetchOpportunities, patchOpportunity } from '../api/opportunities';
import { extractRestPageInfo, normalizeRestListResponse } from '../api/rest-list';
import type { DealBoardFilters, LineItemRow, OpportunityRow } from '../types';
import { opportunityMatchesDateFilter } from '../utils/resolve-opportunity-date';
import { buildOkleykaDealGroups, type OkleykaDealGroup } from './compute';

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

export const fetchOkleykaSalaryPageData = async (
  dateFrom: string,
  dateTo: string,
): Promise<OkleykaDealGroup[]> => {
  const filters: DealBoardFilters = { datePreset: 'custom', dateFrom, dateTo };

  const { records } = await fetchOpportunities({
    limit: PAGE_LIMIT,
    offset: 0,
    sort: [],
    filters,
    visibleCrmFieldNames: ['loadDate'],
    restFieldNames: [
      'name',
      'bitrixLink',
      'loadDate',
      'closeDate',
      'rashodPechat',
      'rashodFrezerovka',
      'rashodOkleyka',
    ],
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
  return buildOkleykaDealGroups(matchedLineItems, dealsById);
};

export const patchOkleykaDealCost = async (
  opportunityId: string,
  rubles: number | null,
): Promise<void> => {
  if (rubles === null) {
    await patchOpportunity(opportunityId, {
      rashodOkleyka: { amountMicros: null, currencyCode: 'RUB' },
    });
    return;
  }

  await patchOpportunity(opportunityId, {
    rashodOkleyka: {
      amountMicros: Math.round(rubles * 1_000_000),
      currencyCode: 'RUB',
    },
  });
};
