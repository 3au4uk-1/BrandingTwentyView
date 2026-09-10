import { defineLogicFunction } from 'twenty-sdk/define';
import type { RoutePayload } from 'twenty-sdk/logic-function';

import { LINE_ITEM_QUANTITY_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

import { crmparserProxyFetch, jsonProxyResponse } from './shared/crmparser-proxy';

const parseRequestBody = (body: unknown): { kolichestvo?: number } | null => {
  if (!body) return null;
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as { kolichestvo?: number };
    } catch {
      return null;
    }
  }
  if (typeof body === 'object') return body as { kolichestvo?: number };
  return null;
};

const handler = async (event: RoutePayload) => {
  const lineItemId = event.pathParameters?.lineItemId?.trim();
  if (!lineItemId) {
    return jsonProxyResponse(400, { error: 'Missing lineItemId' });
  }

  const kolichestvo = parseRequestBody(event.body)?.kolichestvo;
  if (typeof kolichestvo !== 'number' || !Number.isFinite(kolichestvo) || kolichestvo <= 0) {
    return jsonProxyResponse(400, { error: 'Missing or invalid kolichestvo' });
  }

  const { status, body } = await crmparserProxyFetch(
    `/twenty/line-items/${encodeURIComponent(lineItemId)}/quantity`,
    {
      method: 'POST',
      body: JSON.stringify({ kolichestvo }),
    },
  );

  return jsonProxyResponse(status, body);
};

export default defineLogicFunction({
  universalIdentifier: LINE_ITEM_QUANTITY_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'line-item-quantity',
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: {
    path: '/crmparser/line-items/:lineItemId/quantity',
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
