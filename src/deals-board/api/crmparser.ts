export type ListName = 'blacklist' | 'restoration' | 'podryad' | 'banner';

export type ManualLineItemSyncBody = {
  opportunityId: string;
  name: string;
  kolichestvo: number;
  amountMicros: number;
  currencyCode: string;
};

export type LineItemListStatus = {
  blacklisted: boolean;
  restorationMatch: boolean;
  podryadMatch: boolean;
  bannerMatch: boolean;
  pattern: string;
  dealId: number;
  dealTwentyId: string | null;
};

import { getTwentyFunctionsBaseUrl } from '../utils/twenty-functions-base-url';

const readProcessEnv = (): Record<string, string | undefined> =>
  globalThis.process?.env ?? {};

const getAppAccessToken = (): string | null => {
  const token = readProcessEnv().TWENTY_APP_ACCESS_TOKEN?.trim();
  return token || null;
};

export const isCrmparserConfigured = (): boolean =>
  Boolean(getTwentyFunctionsBaseUrl() && getAppAccessToken());

const formatCrmparserProxyError = (status: number, body: unknown): string => {
  const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const messages = Array.isArray(record.messages)
    ? record.messages.filter((message): message is string => typeof message === 'string')
    : [];
  const detail =
    (typeof record.error === 'string' && record.error) ||
    messages[0] ||
    `Crmparser proxy error ${status}`;

  if (detail.includes('fetch failed')) {
    return 'Парсер недоступен с сервера Twenty. В настройках приложения укажите CRMPARSER_API_INTERNAL_URL=http://crmparser:3000/api (Docker) или проверьте CRMPARSER_API_URL.';
  }

  return detail;
};

async function logicFunctionFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = getTwentyFunctionsBaseUrl();
  const token = getAppAccessToken();
  if (!baseUrl || !token) {
    throw new Error('Crmparser proxy not configured');
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  const body = (await response.json().catch(() => ({}))) as T & {
    error?: string;
    messages?: string[];
  };
  if (!response.ok) {
    throw new Error(formatCrmparserProxyError(response.status, body));
  }

  return body;
}

export async function fetchLineItemListStatus(
  lineItemId: string,
): Promise<LineItemListStatus | null> {
  if (!isCrmparserConfigured()) return null;
  try {
    return await logicFunctionFetch<LineItemListStatus>(
      `/crmparser/line-items/${encodeURIComponent(lineItemId)}/list-status`,
    );
  } catch {
    return null;
  }
}

export async function addLineItemToList(lineItemId: string, list: ListName) {
  return logicFunctionFetch<{ success: boolean }>(
    `/crmparser/line-items/${encodeURIComponent(lineItemId)}/add-to-list`,
    {
      method: 'POST',
      body: JSON.stringify({ list }),
    },
  );
}

export async function syncManualLineItem(lineItemId: string, body: ManualLineItemSyncBody) {
  return logicFunctionFetch<{ success: boolean; dealItemId?: number }>(
    `/crmparser/line-items/${encodeURIComponent(lineItemId)}/sync`,
    { method: 'POST', body: JSON.stringify(body) },
  );
}

export async function archiveManualLineItem(lineItemId: string) {
  return logicFunctionFetch<{ success: boolean }>(
    `/crmparser/line-items/${encodeURIComponent(lineItemId)}/archive`,
    { method: 'POST', body: JSON.stringify({}) },
  );
}
