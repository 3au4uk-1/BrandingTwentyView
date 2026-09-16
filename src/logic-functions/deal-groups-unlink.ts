import { defineLogicFunction } from 'twenty-sdk/define';
import type { RoutePayload } from 'twenty-sdk/logic-function';

import { DEAL_GROUPS_UNLINK_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

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

const resolveGroupId = async (
  groupIdParam: string,
  twentyOppId: string,
): Promise<{ groupId?: string; errorStatus?: number; errorBody?: unknown }> => {
  if (groupIdParam !== 'by-opp') {
    return { groupId: groupIdParam };
  }

  const lookup = await crmparserProxyFetch(
    `/twenty/deal-groups?twentyOppId=${encodeURIComponent(twentyOppId)}`,
  );
  if (lookup.status >= 400) {
    return { errorStatus: lookup.status, errorBody: lookup.body };
  }

  const group = (lookup.body as { group?: { id?: number } } | null)?.group;
  if (group?.id == null) {
    return { errorStatus: 404, errorBody: { error: 'Deal group not found' } };
  }

  return { groupId: String(group.id) };
};

const handler = async (event: RoutePayload) => {
  const groupIdParam = event.pathParameters?.id?.trim();
  if (!groupIdParam) {
    return jsonProxyResponse(400, { error: 'Missing group id' });
  }

  const payload = parseRequestBody(event.body) ?? {};
  const dissolve = payload.dissolve === true;

  if (dissolve) {
    if (groupIdParam === 'by-opp') {
      return jsonProxyResponse(400, { error: 'dissolve requires numeric group id' });
    }
    const { status, body } = await crmparserProxyFetch(
      `/twenty/deal-groups/${encodeURIComponent(groupIdParam)}/dissolve`,
      {
        method: 'POST',
        body: JSON.stringify({}),
      },
    );
    return jsonProxyResponse(status, body);
  }

  const twentyOppId =
    typeof payload.twentyOppId === 'string' ? payload.twentyOppId.trim() : '';
  if (!twentyOppId) {
    return jsonProxyResponse(400, { error: 'Missing twentyOppId' });
  }

  const resolved = await resolveGroupId(groupIdParam, twentyOppId);
  if (resolved.errorStatus) {
    return jsonProxyResponse(resolved.errorStatus, resolved.errorBody);
  }

  const { status, body } = await crmparserProxyFetch(
    `/twenty/deal-groups/${encodeURIComponent(resolved.groupId!)}/unlink`,
    {
      method: 'POST',
      body: JSON.stringify({ twentyOppId }),
    },
  );

  return jsonProxyResponse(status, body);
};

export default defineLogicFunction({
  universalIdentifier: DEAL_GROUPS_UNLINK_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'deal-groups-unlink',
  timeoutSeconds: 120,
  handler,
  httpRouteTriggerSettings: {
    path: '/crmparser/deal-groups/:id/unlink',
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
