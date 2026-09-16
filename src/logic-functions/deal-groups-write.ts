import { defineLogicFunction } from 'twenty-sdk/define';
import type { RoutePayload } from 'twenty-sdk/logic-function';

import { DEAL_GROUPS_WRITE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

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
  const payload = parseRequestBody(event.body);
  if (!payload) {
    return jsonProxyResponse(400, { error: 'Missing body' });
  }

  const { status, body } = await crmparserProxyFetch('/twenty/deal-groups', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return jsonProxyResponse(status, body);
};

export default defineLogicFunction({
  universalIdentifier: DEAL_GROUPS_WRITE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'deal-groups-write',
  timeoutSeconds: 120,
  handler,
  httpRouteTriggerSettings: {
    path: '/crmparser/deal-groups',
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
