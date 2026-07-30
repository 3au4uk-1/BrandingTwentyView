import { CoreApiClient } from 'twenty-client-sdk/core';
import { RestApiClient } from 'twenty-client-sdk/rest';
import { defineLogicFunction } from 'twenty-sdk/define';
import type { RoutePayload } from 'twenty-sdk/logic-function';

import { DEALS_BOARD_PAGE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

import { jsonProxyResponse } from './shared/crmparser-proxy';
import { formatDealsBoardPageFailure } from './shared/deals-board-page-core';
import { runDealsBoardPagePipeline } from './shared/deals-board-page-pipeline';
import {
  enrichOpportunityRowsWithRestFields,
  fetchLineItemsByOpportunityIds,
} from './shared/deals-board-page-rest';
import type { DealsBoardPageRequest } from './shared/deals-board-page-types';

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

const handler = async (event: RoutePayload) => {
  const body = parseRequestBody(event.body);
  if (!body?.limit || body.offset == null || !Array.isArray(body.orderBy)) {
    return jsonProxyResponse(400, { error: 'invalid deals-board page request' });
  }

  try {
    const coreClient = new CoreApiClient();
    const restClient = new RestApiClient();

    const response = await runDealsBoardPagePipeline(
      {
        queryOpportunities: ({ nodeSelection, ...gqlArgs }) =>
          coreClient.query({
            opportunities: {
              __args: gqlArgs,
              edges: { node: nodeSelection },
              totalCount: true,
            },
          }),
        enrichWithRest: (rows, restFieldNames) =>
          enrichOpportunityRowsWithRestFields(restClient, rows, restFieldNames),
        fetchLineItems: (opportunityIds) =>
          fetchLineItemsByOpportunityIds(restClient, opportunityIds),
      },
      body,
    );

    return jsonProxyResponse(200, response);
  } catch (error) {
    return jsonProxyResponse(500, formatDealsBoardPageFailure(error));
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
