import {
  capLineItemIdsForListStatus,
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
import { fetchOpportunities } from './opportunities';
import { fetchLineItemsListStatusBatch } from './crmparser';
import type { DealBoardFilters, DealBoardSort } from '../types';
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

  const response = await fetch(`${baseUrl}/deals-board/page`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
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

  const lineItems = await fetchLineItemsByOpportunityIds(opportunityIds, params.lineItemFilters);

  let listStatusByLineItemId: Record<string, unknown> | undefined;
  if (request.includeListStatus) {
    const lineItemIds = capLineItemIdsForListStatus(
      lineItems
        .map((item) => (typeof item.id === 'string' ? item.id : ''))
        .filter(Boolean),
    );
    if (lineItemIds.length > 0) {
      const statuses = await fetchLineItemsListStatusBatch(lineItemIds);
      if (Object.keys(statuses).length > 0) {
        listStatusByLineItemId = statuses;
      }
    }
  }

  return assembleDealsBoardPageFromLegacy({ records, totalCount }, lineItems, listStatusByLineItemId);
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
