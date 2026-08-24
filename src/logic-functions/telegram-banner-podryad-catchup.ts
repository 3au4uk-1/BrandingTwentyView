import { defineLogicFunction } from 'twenty-sdk/define';
import type { RoutePayload } from 'twenty-sdk/logic-function';

import { TELEGRAM_BANNER_PODRYAD_CATCHUP_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

import { crmparserProxyFetch, jsonProxyResponse } from './shared/crmparser-proxy';

const handler = async (event: RoutePayload) => {
  const raw =
    typeof event.body === 'string' ? JSON.parse(event.body || '{}') : (event.body ?? {});
  const payload =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const { status, body } = await crmparserProxyFetch(`/twenty/telegram/events`, {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      event: 'banner_podryad.catchup',
    }),
  });
  return jsonProxyResponse(status, body);
};

export default defineLogicFunction({
  universalIdentifier: TELEGRAM_BANNER_PODRYAD_CATCHUP_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'telegram-banner-podryad-catchup',
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: {
    path: '/crmparser/telegram/banner-podryad-catchup',
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
