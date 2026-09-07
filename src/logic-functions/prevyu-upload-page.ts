import { defineLogicFunction } from 'twenty-sdk/define';
import { Response, type RoutePayload } from 'twenty-sdk/logic-function';
import { RestApiClient } from 'twenty-client-sdk/rest';

import { PREVYU_UPLOAD_PAGE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

import { buildPrevyuUploadHtml } from './shared/prevyu-upload-html';
import { parsePrevyuFileRefsForDisplay } from './shared/prevyu-upload-service';

const readLineItem = async (lineItemId: string) => {
  const client = new RestApiClient();
  const row = await client.get<Record<string, unknown>>(
    `/rest/dealLineItems/${encodeURIComponent(lineItemId)}`,
  );
  const data =
    (row?.data as Record<string, unknown> | undefined)?.dealLineItem ??
    row?.dealLineItem ??
    row;
  return (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
};

const handler = async (event: RoutePayload) => {
  const lineItemId = event.pathParameters?.lineItemId?.trim();
  if (!lineItemId) {
    return new Response('Missing lineItemId', {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  let lineItemName = '';
  let files = [] as ReturnType<typeof parsePrevyuFileRefsForDisplay>;
  try {
    const record = await readLineItem(lineItemId);
    lineItemName = typeof record.name === 'string' ? record.name : '';
    files = parsePrevyuFileRefsForDisplay(record.prevyuOkleyki);
  } catch {
    // still render; upload may fail if id invalid
  }

  // Direct browser open of this GET still needs session/app auth at the gateway.
  // Board modal prefers srcdoc with embedded token (see PrevyuUploadModal).
  const requestUrl = (event as { rawPath?: string; path?: string }).rawPath
    || (event as { path?: string }).path
    || `/prevyu-upload/${lineItemId}`;
  const html = buildPrevyuUploadHtml({
    lineItemId,
    lineItemName,
    files,
    postUrl: requestUrl,
    accessToken: '',
  });
  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
};

export default defineLogicFunction({
  universalIdentifier: PREVYU_UPLOAD_PAGE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'prevyu-upload-page',
  timeoutSeconds: 30,
  handler,
  httpRouteTriggerSettings: {
    path: '/prevyu-upload/:lineItemId',
    httpMethod: 'GET',
    isAuthRequired: true,
  },
});
