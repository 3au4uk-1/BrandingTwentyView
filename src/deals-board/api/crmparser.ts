export type ListName = 'blacklist' | 'restoration' | 'podryad' | 'banner';

export type LineItemListStatus = {
  blacklisted: boolean;
  restorationMatch: boolean;
  podryadMatch: boolean;
  bannerMatch: boolean;
  pattern: string;
  dealId: number;
  dealTwentyId: string | null;
};

const readProcessEnv = (): Record<string, string | undefined> =>
  globalThis.process?.env ?? {};

const getFunctionsBaseUrl = (): string | null => {
  const baseUrl = readProcessEnv().TWENTY_FUNCTIONS_URL?.trim().replace(/\/$/, '');
  return baseUrl || null;
};

const getAppAccessToken = (): string | null => {
  const token = readProcessEnv().TWENTY_APP_ACCESS_TOKEN?.trim();
  return token || null;
};

export const isCrmparserConfigured = (): boolean =>
  Boolean(getFunctionsBaseUrl() && getAppAccessToken());

async function logicFunctionFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = getFunctionsBaseUrl();
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

  const body = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(body.error ?? `Crmparser proxy error ${response.status}`);
  }

  return body;
}

export async function fetchLineItemListStatus(
  lineItemId: string,
): Promise<LineItemListStatus | null> {
  if (!isCrmparserConfigured()) return null;
  return logicFunctionFetch<LineItemListStatus>(
    `/crmparser/line-items/${encodeURIComponent(lineItemId)}/list-status`,
  );
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
