import { defineLogicFunction } from 'twenty-sdk/define';
import type { RoutePayload } from 'twenty-sdk/logic-function';

import { DEAL_GROUPS_SUGGEST_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

import { crmparserProxyFetch, jsonProxyResponse } from './shared/crmparser-proxy';

const handler = async (_event: RoutePayload) => {
  const { status, body } = await crmparserProxyFetch('/twenty/deal-groups/suggestions');
  return jsonProxyResponse(status, body);
};

export default defineLogicFunction({
  universalIdentifier: DEAL_GROUPS_SUGGEST_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'deal-groups-suggest',
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: {
    path: '/crmparser/deal-groups/suggestions',
    httpMethod: 'GET',
    isAuthRequired: true,
  },
});
