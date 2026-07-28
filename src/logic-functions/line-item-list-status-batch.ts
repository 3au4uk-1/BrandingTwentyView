import { defineLogicFunction } from 'twenty-sdk/define';
import type { RoutePayload } from 'twenty-sdk/logic-function';

import { LINE_ITEM_LIST_STATUS_BATCH_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

import { crmparserProxyFetch, jsonProxyResponse } from './shared/crmparser-proxy';

const parseRequestBody = (body: unknown): { ids?: unknown } | null => {
  if (!body) return null;
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as { ids?: unknown };
    } catch {
      return null;
    }
  }
  if (typeof body === 'object') return body as { ids?: unknown };
  return null;
};

const handler = async (event: RoutePayload) => {
  const ids = parseRequestBody(event.body)?.ids;
  if (!Array.isArray(ids)) {
    return jsonProxyResponse(400, { error: 'ids must be an array' });
  }

  const { status, body } = await crmparserProxyFetch(`/twenty/line-items/list-status`, {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });

  return jsonProxyResponse(status, body);
};

export default defineLogicFunction({
  universalIdentifier: LINE_ITEM_LIST_STATUS_BATCH_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'line-item-list-status-batch',
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: {
    path: '/crmparser/line-items/list-status',
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
