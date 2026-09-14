import { defineLogicFunction } from 'twenty-sdk/define';
import type { RoutePayload } from 'twenty-sdk/logic-function';

import { TELEGRAM_OKLEYKA_JOB_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

import { crmparserProxyFetch, jsonProxyResponse } from './shared/crmparser-proxy';

const handler = async (event: RoutePayload) => {
  const lineItemId = event.pathParameters?.lineItemId?.trim();
  if (!lineItemId) {
    return jsonProxyResponse(400, { error: 'Missing lineItemId' });
  }

  const { status, body } = await crmparserProxyFetch(
    `/twenty/telegram/okleyka-jobs/${encodeURIComponent(lineItemId)}`,
  );

  return jsonProxyResponse(status, body);
};

export default defineLogicFunction({
  universalIdentifier: TELEGRAM_OKLEYKA_JOB_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'telegram-okleyka-job',
  timeoutSeconds: 30,
  handler,
  httpRouteTriggerSettings: {
    path: '/crmparser/telegram/okleyka-job/:lineItemId',
    httpMethod: 'GET',
    isAuthRequired: true,
  },
});
