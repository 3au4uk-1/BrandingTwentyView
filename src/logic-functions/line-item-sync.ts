import { defineLogicFunction } from 'twenty-sdk/define';
import type { RoutePayload } from 'twenty-sdk/logic-function';

import { LINE_ITEM_SYNC_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

import { crmparserProxyFetch, jsonProxyResponse } from './shared/crmparser-proxy';

const parseRequestBody = (body: unknown): Record<string, unknown> | null => {
  if (!body) return null;
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  if (typeof body === 'object') return body as Record<string, unknown>;
  return null;
};

const handler = async (event: RoutePayload) => {
  const lineItemId = event.pathParameters?.lineItemId?.trim();
  if (!lineItemId) {
    return jsonProxyResponse(400, { error: 'Missing lineItemId' });
  }

  const payload = parseRequestBody(event.body);
  if (!payload) {
    return jsonProxyResponse(400, { error: 'Missing body' });
  }

  const { status, body } = await crmparserProxyFetch(
    `/twenty/line-items/${encodeURIComponent(lineItemId)}/sync`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );

  return jsonProxyResponse(status, body);
};

export default defineLogicFunction({
  universalIdentifier: LINE_ITEM_SYNC_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'line-item-sync',
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: {
    path: '/crmparser/line-items/:lineItemId/sync',
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
