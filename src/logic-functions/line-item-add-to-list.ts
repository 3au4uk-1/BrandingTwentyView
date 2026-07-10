import { defineLogicFunction } from 'twenty-sdk/define';
import type { RoutePayload } from 'twenty-sdk/logic-function';

import { LINE_ITEM_ADD_TO_LIST_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

import { crmparserProxyFetch, jsonProxyResponse } from './shared/crmparser-proxy';

const handler = async (event: RoutePayload) => {
  const lineItemId = event.pathParameters?.lineItemId?.trim();
  if (!lineItemId) {
    return jsonProxyResponse(400, { error: 'Missing lineItemId' });
  }

  const list = (event.body as { list?: string } | null)?.list;
  if (!list) {
    return jsonProxyResponse(400, { error: 'Missing list' });
  }

  const { status, body } = await crmparserProxyFetch(
    `/twenty/line-items/${encodeURIComponent(lineItemId)}/add-to-list`,
    {
      method: 'POST',
      body: JSON.stringify({ list }),
    },
  );

  return jsonProxyResponse(status, body);
};

export default defineLogicFunction({
  universalIdentifier: LINE_ITEM_ADD_TO_LIST_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'line-item-add-to-list',
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: {
    path: '/crmparser/line-items/:lineItemId/add-to-list',
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
