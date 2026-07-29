import { getTwentyFunctionsBaseUrl } from './twenty-functions-base-url';

export const PREVYU_UPLOAD_CHANNEL = 'prevyu-upload';

export const buildPrevyuUploadPageUrl = (
  baseUrl: string,
  lineItemId: string,
): string =>
  `${baseUrl.replace(/\/$/, '')}/prevyu-upload/${encodeURIComponent(lineItemId)}`;

export const resolvePrevyuUploadPageUrl = (lineItemId: string): string | null => {
  const base = getTwentyFunctionsBaseUrl();
  if (!base || !lineItemId.trim()) return null;
  return buildPrevyuUploadPageUrl(base, lineItemId.trim());
};
