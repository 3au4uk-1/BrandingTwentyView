import { defineLogicFunction } from 'twenty-sdk/define';
import type { RoutePayload } from 'twenty-sdk/logic-function';

import { LINE_ITEM_ARCHIVE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

import { crmparserProxyFetch, jsonProxyResponse } from './shared/crmparser-proxy';

const handler = async (event: RoutePayload) => {
  const lineItemId = event.pathParameters?.lineItemId?.trim();
  if (!lineItemId) {
    return jsonProxyResponse(400, { error: 'Missing lineItemId' });
  }

  const { status, body } = await crmparserProxyFetch(
    `/twenty/line-items/${encodeURIComponent(lineItemId)}/archive`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
  );

  return jsonProxyResponse(status, body);
};

export default defineLogicFunction({
  universalIdentifier: LINE_ITEM_ARCHIVE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'line-item-archive',
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: {
    path: '/crmparser/line-items/:lineItemId/archive',
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
