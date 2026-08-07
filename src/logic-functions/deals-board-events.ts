import { defineLogicFunction } from 'twenty-sdk/define';
import type { RoutePayload } from 'twenty-sdk/logic-function';

import { DEALS_BOARD_EVENTS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

import { buildBoardEventsPath } from './shared/board-events-path';
import { crmparserProxyFetch, jsonProxyResponse } from './shared/crmparser-proxy';

const handler = async (event: RoutePayload) => {
  const { status, body } = await crmparserProxyFetch(
    buildBoardEventsPath(event.queryStringParameters),
  );

  return jsonProxyResponse(status, body);
};

export default defineLogicFunction({
  universalIdentifier: DEALS_BOARD_EVENTS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'deals-board-events',
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: {
    path: '/deals-board/events',
    httpMethod: 'GET',
    isAuthRequired: true,
  },
});
