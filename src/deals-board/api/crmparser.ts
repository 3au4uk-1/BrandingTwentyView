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

export type CrmparserConfig = {
  baseUrl: string;
  secret: string;
};

export const getCrmparserConfig = (): CrmparserConfig | null => {
  const env = readProcessEnv();
  const baseUrl = env.CRMPARSER_API_URL?.trim().replace(/\/$/, '');
  const secret = env.CRMPARSER_API_SECRET?.trim();
  if (!baseUrl || !secret) return null;
  return { baseUrl, secret };
};

export const isCrmparserConfigured = (): boolean => getCrmparserConfig() !== null;

export const buildListStatusUrl = (lineItemId: string): string => {
  const config = getCrmparserConfig();
  if (!config) return '';
  return `${config.baseUrl}/twenty/line-items/${lineItemId}/list-status`;
};

async function crmparserFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const config = getCrmparserConfig();
  if (!config) {
    throw new Error('Crmparser API not configured');
  }

  const response = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.secret}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Crmparser API error ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchLineItemListStatus(
  lineItemId: string,
): Promise<LineItemListStatus | null> {
  if (!isCrmparserConfigured()) return null;
  return crmparserFetch<LineItemListStatus>(`/twenty/line-items/${lineItemId}/list-status`);
}

export async function addLineItemToList(lineItemId: string, list: ListName) {
  return crmparserFetch<{ success: boolean }>(`/twenty/line-items/${lineItemId}/add-to-list`, {
    method: 'POST',
    body: JSON.stringify({ list }),
  });
}
