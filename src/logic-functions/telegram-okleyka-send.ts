import { defineLogicFunction } from 'twenty-sdk/define';
import type { RoutePayload } from 'twenty-sdk/logic-function';

import { TELEGRAM_OKLEYKA_SEND_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

import { crmparserProxyFetch, jsonProxyResponse } from './shared/crmparser-proxy';

const handler = async (event: RoutePayload) => {
  const raw =
    typeof event.body === 'string' ? JSON.parse(event.body || '{}') : (event.body ?? {});
  const { status, body } = await crmparserProxyFetch(`/twenty/telegram/events`, {
    method: 'POST',
    body: JSON.stringify(raw),
  });
  return jsonProxyResponse(status, body);
};

export default defineLogicFunction({
  universalIdentifier: TELEGRAM_OKLEYKA_SEND_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'telegram-okleyka-send',
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: {
    path: '/crmparser/telegram/okleyka-send',
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
