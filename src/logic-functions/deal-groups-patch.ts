import { defineLogicFunction } from 'twenty-sdk/define';
import type { RoutePayload } from 'twenty-sdk/logic-function';

import { DEAL_GROUPS_PATCH_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

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
  const groupId = event.pathParameters?.id?.trim();
  if (!groupId) {
    return jsonProxyResponse(400, { error: 'Missing group id' });
  }

  const payload = parseRequestBody(event.body);
  if (!payload) {
    return jsonProxyResponse(400, { error: 'Missing body' });
  }

  const { status, body } = await crmparserProxyFetch(
    `/twenty/deal-groups/${encodeURIComponent(groupId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  );

  return jsonProxyResponse(status, body);
};

export default defineLogicFunction({
  universalIdentifier: DEAL_GROUPS_PATCH_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'deal-groups-patch',
  timeoutSeconds: 120,
  handler,
  httpRouteTriggerSettings: {
    path: '/crmparser/deal-groups/:id',
    httpMethod: 'PATCH',
    isAuthRequired: true,
  },
});
