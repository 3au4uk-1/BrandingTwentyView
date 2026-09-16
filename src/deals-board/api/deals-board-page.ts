import {
  groupLineItemsByOpportunityId,
  shouldUseDealsBoardPageFallback,
} from 'src/logic-functions/shared/deals-board-page-core';
import type {
  DealsBoardPageRequest,
  DealsBoardPageResponse,
  LineItemRowLike,
} from 'src/logic-functions/shared/deals-board-page-types';

import type { LineItemQueryFilters } from './line-items';
import { fetchLineItemsByOpportunityIds } from './line-items';
import {
  fetchChildOpportunitiesByParentIds,
  fetchOpportunities,
} from './opportunities';
import type { DealBoardFilters, DealBoardSort, LineItemRow, OpportunityRow } from '../types';
import { attachChildSmetasToParents } from '../utils/group-smetas';
import { getTwentyFunctionsBaseUrl } from '../utils/twenty-functions-base-url';

export type { DealsBoardPageRequest, DealsBoardPageResponse } from 'src/logic-functions/shared/deals-board-page-types';

export type LegacyDealsBoardPageParams = {
  sort: DealBoardSort[];
  filters: DealBoardFilters;
  lineItemFilters?: LineItemQueryFilters;
};

type LegacyOpportunityPage = {
  records: Array<Record<string, unknown>>;
  totalCount: number;
};

const readProcessEnv = (): Record<string, string | undefined> =>
  globalThis.process?.env ?? {};

const getAppAccessToken = (): string | null => {
  const token = readProcessEnv().TWENTY_APP_ACCESS_TOKEN?.trim();
  return token || null;
};

export const DEALS_BOARD_PAGE_FETCH_TIMEOUT_MS = 3000;

const createDealsBoardPageError = (
  message: string,
  status?: number,
  code?: string,
): Error & { status?: number; code?: string } => {
  const error = new Error(message) as Error & { status?: number; code?: string };
  if (typeof status === 'number') error.status = status;
  if (typeof code === 'string') error.code = code;
  return error;
};

const postDealsBoardPage = async (
  request: DealsBoardPageRequest,
): Promise<DealsBoardPageResponse> => {
  const baseUrl = getTwentyFunctionsBaseUrl();
  const token = getAppAccessToken();
  if (!baseUrl || !token) {
    throw createDealsBoardPageError('Deals board page proxy not configured', undefined, 'NOT_CONFIGURED');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEALS_BOARD_PAGE_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}/deals-board/page`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    const body = (await response.json().catch(() => ({}))) as DealsBoardPageResponse & {
      error?: string;
      messages?: string[];
    };

    if (!response.ok) {
      const detail =
        (typeof body.error === 'string' && body.error) ||
        (Array.isArray(body.messages) ? body.messages[0] : undefined) ||
        `Deals board page error ${response.status}`;
      throw createDealsBoardPageError(detail, response.status);
    }

    return body;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const assembleDealsBoardPageFromLegacy = <T extends LineItemRowLike>(
  opportunities: LegacyOpportunityPage,
  lineItems: T[],
  listStatusByLineItemId?: Record<string, unknown>,
): DealsBoardPageResponse => {
  const response: DealsBoardPageResponse = {
    opportunities: opportunities.records,
    totalCount: opportunities.totalCount,
    lineItemsByOppId: groupLineItemsByOpportunityId(lineItems),
  };

  if (listStatusByLineItemId && Object.keys(listStatusByLineItemId).length > 0) {
    response.listStatusByLineItemId = listStatusByLineItemId;
  }

  return response;
};

export const fetchLegacyDealsBoardPage = async (
  request: DealsBoardPageRequest,
  params: LegacyDealsBoardPageParams,
): Promise<DealsBoardPageResponse> => {
  const { records, totalCount } = await fetchOpportunities({
    limit: request.limit,
    offset: request.offset,
    sort: params.sort,
    filters: params.filters,
    visibleCrmFieldNames: request.visibleCrmFieldNames,
    restFieldNames: request.restFieldNames,
    includeCompanyRelation: request.includeCompanyRelation,
    fieldTypesByName: request.fieldTypesByName,
  });

  const opportunityIds = records
    .map((record) => (typeof record.id === 'string' ? record.id : ''))
    .filter(Boolean);

  const childRecords = await fetchChildOpportunitiesByParentIds(opportunityIds);
  const childIds = childRecords
    .map((record) => (typeof record.id === 'string' ? record.id : ''))
    .filter(Boolean);

  const lineItems = (await fetchLineItemsByOpportunityIds(
    [...opportunityIds, ...childIds],
    params.lineItemFilters,
  )) as LineItemRow[];

  const opportunitiesWithChildren = attachChildSmetasToParents(
    records as OpportunityRow[],
    childRecords,
    lineItems,
  );

  return assembleDealsBoardPageFromLegacy(
    { records: opportunitiesWithChildren, totalCount },
    lineItems,
  );
};

export const fetchDealsBoardPage = async (
  request: DealsBoardPageRequest,
  legacy: () => Promise<DealsBoardPageResponse>,
): Promise<DealsBoardPageResponse> => {
  try {
    return await postDealsBoardPage(request);
  } catch (error) {
    if (!shouldUseDealsBoardPageFallback(error)) throw error;
    console.warn('[deals-board-page] falling back to multi-call path', error);
    return legacy();
  }
};
