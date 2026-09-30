import { defineLogicFunction } from 'twenty-sdk/define';
import { Response, type RoutePayload } from 'twenty-sdk/logic-function';
import { MetadataApiClient } from 'twenty-client-sdk/metadata';
import { RestApiClient } from 'twenty-client-sdk/rest';

import {
  DEAL_LINE_ITEM_FOTO_PROIZVODSTVA_FIELD_UNIVERSAL_IDENTIFIER,
  DEAL_LINE_ITEM_PREVYU_OKLEYKI_FIELD_UNIVERSAL_IDENTIFIER,
  PREVYU_UPLOAD_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

import {
  buildNextPrevyuFiles,
  decodePrevyuUploadBytes,
  parsePrevyuFileRefsForDisplay,
  parsePrevyuUploadBody,
  PREVYU_UPLOAD_MAX_FILES,
  readUploadFieldName,
  sanitizePrevyuFileRefs,
  type PrevyuFileFieldName,
} from './shared/prevyu-upload-service';

const FILE_FIELD_IDS: Record<PrevyuFileFieldName, string> = {
  prevyuOkleyki: DEAL_LINE_ITEM_PREVYU_OKLEYKI_FIELD_UNIVERSAL_IDENTIFIER,
  fotoProizvodstva: DEAL_LINE_ITEM_FOTO_PROIZVODSTVA_FIELD_UNIVERSAL_IDENTIFIER,
};

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });

const parseBody = (raw: unknown): unknown => {
  if (raw == null) return null;
  if (typeof raw === 'object') return raw;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
};

const readCurrentFiles = async (lineItemId: string, fieldName: PrevyuFileFieldName) => {
  const record = await readLineItemRecord(lineItemId);
  return sanitizePrevyuFileRefs(record[fieldName]);
};

const readDisplayFiles = async (lineItemId: string, fieldName: PrevyuFileFieldName) => {
  const record = await readLineItemRecord(lineItemId);
  return parsePrevyuFileRefsForDisplay(record[fieldName]);
};

const readLineItemRecord = async (lineItemId: string) => {
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
    return jsonResponse(400, { error: 'Missing lineItemId' });
  }

  const rawBody = parseBody(event.body);
  const fieldName = readUploadFieldName(rawBody);
  if (typeof fieldName !== 'string') {
    return jsonResponse(400, { error: fieldName.error });
  }

  const parsed = parsePrevyuUploadBody(rawBody);
  if ('error' in parsed) {
    return jsonResponse(400, { error: parsed.error });
  }

  const decoded = decodePrevyuUploadBytes(parsed);
  if ('error' in decoded) {
    return jsonResponse(400, { error: decoded.error });
  }

  try {
    const current = await readCurrentFiles(lineItemId, fieldName);
    if (current.length >= PREVYU_UPLOAD_MAX_FILES) {
      return jsonResponse(400, { error: 'Максимум 6 файлов' });
    }

    const metadata = new MetadataApiClient();
    const uploaded = await metadata.uploadFile(
      new Uint8Array(decoded.buffer),
      decoded.filename,
      decoded.contentType,
      FILE_FIELD_IDS[fieldName],
    );

    if (!uploaded?.id) {
      return jsonResponse(500, { error: 'Upload did not return file id' });
    }

    const next = buildNextPrevyuFiles(current, { id: uploaded.id }, decoded.filename);

    const rest = new RestApiClient();
    await rest.patch(`/rest/dealLineItems/${encodeURIComponent(lineItemId)}`, {
      [fieldName]: next,
    });

    const files = await readDisplayFiles(lineItemId, fieldName);
    return jsonResponse(200, { ok: true, files });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    const friendly =
      /fetch failed|Failed to fetch|NetworkError/i.test(message)
        ? 'Не удалось сохранить файл на сервере Twenty (сеть Metadata API). Попробуйте через карточку позиции.'
        : message;
    return jsonResponse(500, { error: friendly });
  }
};

export default defineLogicFunction({
  universalIdentifier: PREVYU_UPLOAD_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'prevyu-upload',
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: {
    path: '/prevyu-upload/:lineItemId',
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
