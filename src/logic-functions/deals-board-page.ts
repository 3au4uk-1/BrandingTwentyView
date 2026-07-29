import { CoreApiClient } from 'twenty-client-sdk/core';
import { RestApiClient } from 'twenty-client-sdk/rest';
import { defineLogicFunction } from 'twenty-sdk/define';
import type { RoutePayload } from 'twenty-sdk/logic-function';

import { DEALS_BOARD_PAGE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

import { crmparserProxyFetch, jsonProxyResponse } from './shared/crmparser-proxy';
import {
  capLineItemIdsForListStatus,
  groupLineItemsByOpportunityId,
  resolveFieldTypesByName,
} from './shared/deals-board-page-core';
import { buildOpportunityNodeSelection } from './shared/deals-board-page-opportunity-selection';
import {
  enrichOpportunityRowsWithRestFields,
  fetchLineItemsByOpportunityIds,
} from './shared/deals-board-page-rest';
import type {
  DealsBoardPageRequest,
  DealsBoardPageResponse,
} from './shared/deals-board-page-types';

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? value : []);

const parseRequestBody = (body: unknown): DealsBoardPageRequest | null => {
  if (!body) return null;
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as DealsBoardPageRequest;
    } catch {
      return null;
    }
  }
  if (typeof body === 'object') return body as DealsBoardPageRequest;
  return null;
};

const normalizeOpportunityNode = (
  node: Record<string, unknown> & {
    company?: { id?: string; name?: string };
    closeDate?: string;
    loadDate?: string;
  },
): Record<string, unknown> => ({
  ...node,
  companyName: node.company?.name,
  loadDate: node.loadDate ?? node.closeDate,
});

const fetchListStatusByLineItemId = async (
  lineItemIds: string[],
): Promise<Record<string, unknown> | undefined> => {
  if (lineItemIds.length === 0) return undefined;

  const cappedIds = capLineItemIdsForListStatus(lineItemIds);
  const { status, body } = await crmparserProxyFetch(`/twenty/line-items/list-status`, {
    method: 'POST',
    body: JSON.stringify({ ids: cappedIds }),
  });

  if (status < 200 || status >= 300) return undefined;

  const statuses =
    body && typeof body === 'object'
      ? (body as { statuses?: Record<string, unknown> }).statuses
      : undefined;

  return statuses && typeof statuses === 'object' ? statuses : undefined;
};

const handler = async (event: RoutePayload) => {
  const body = parseRequestBody(event.body);
  if (!body?.limit || body.offset == null || !Array.isArray(body.orderBy)) {
    return jsonProxyResponse(400, { error: 'invalid deals-board page request' });
  }

  try {
    const coreClient = new CoreApiClient();
    const nodeSelection = buildOpportunityNodeSelection(
      body.visibleCrmFieldNames ?? [],
      body.includeCompanyRelation ?? false,
      resolveFieldTypesByName(body.fieldTypesByName),
    );

    const result = await coreClient.query({
      opportunities: {
        __args: {
          first: body.limit,
          offset: body.offset,
          orderBy: body.orderBy,
          filter: body.opportunityFilter,
        },
        edges: { node: nodeSelection },
        totalCount: true,
      },
    });

    const edges = asArray<{ node: Record<string, unknown> }>(result.opportunities?.edges);
    let opportunities = edges.map((edge) => normalizeOpportunityNode(edge.node));

    const restClient = new RestApiClient();
    opportunities = await enrichOpportunityRowsWithRestFields(
      restClient,
      opportunities,
      body.restFieldNames ?? [],
    );

    const opportunityIds = opportunities
      .map((record) => (typeof record.id === 'string' ? record.id : ''))
      .filter(Boolean);

    const lineItems = await fetchLineItemsByOpportunityIds(restClient, opportunityIds);
    const lineItemsByOppId = groupLineItemsByOpportunityId(lineItems);

    const response: DealsBoardPageResponse = {
      opportunities,
      totalCount: result.opportunities?.totalCount ?? 0,
      lineItemsByOppId,
    };

    if (body.includeListStatus) {
      const lineItemIds = lineItems
        .map((item) => (typeof item.id === 'string' ? item.id : ''))
        .filter(Boolean);
      const listStatusByLineItemId = await fetchListStatusByLineItemId(lineItemIds);
      if (listStatusByLineItemId) {
        response.listStatusByLineItemId = listStatusByLineItemId;
      }
    }

    return jsonProxyResponse(200, response);
  } catch (error) {
    return jsonProxyResponse(500, {
      error: error instanceof Error ? error.message : 'deals-board page failed',
    });
  }
};

export default defineLogicFunction({
  universalIdentifier: DEALS_BOARD_PAGE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'deals-board-page',
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: {
    path: '/deals-board/page',
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
