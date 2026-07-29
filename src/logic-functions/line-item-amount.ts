import { defineLogicFunction } from 'twenty-sdk/define';
import type { RoutePayload } from 'twenty-sdk/logic-function';

import { LINE_ITEM_AMOUNT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

import { crmparserProxyFetch, jsonProxyResponse } from './shared/crmparser-proxy';

const parseRequestBody = (body: unknown): { amountRub?: number } | null => {
  if (!body) return null;
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as { amountRub?: number };
    } catch {
      return null;
    }
  }
  if (typeof body === 'object') return body as { amountRub?: number };
  return null;
};

const handler = async (event: RoutePayload) => {
  const lineItemId = event.pathParameters?.lineItemId?.trim();
  if (!lineItemId) {
    return jsonProxyResponse(400, { error: 'Missing lineItemId' });
  }

  const amountRub = parseRequestBody(event.body)?.amountRub;
  if (typeof amountRub !== 'number' || !Number.isFinite(amountRub) || amountRub < 0) {
    return jsonProxyResponse(400, { error: 'Missing or invalid amountRub' });
  }

  const { status, body } = await crmparserProxyFetch(
    `/twenty/line-items/${encodeURIComponent(lineItemId)}/amount`,
    {
      method: 'POST',
      body: JSON.stringify({ amountRub }),
    },
  );

  return jsonProxyResponse(status, body);
};

export default defineLogicFunction({
  universalIdentifier: LINE_ITEM_AMOUNT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'line-item-amount',
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: {
    path: '/crmparser/line-items/:lineItemId/amount',
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
