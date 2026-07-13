import { Response } from 'twenty-sdk/logic-function';

export type CrmparserProxyConfig = {
  baseUrl: string;
  internalUrl?: string;
  secret: string;
};

const normalizeBaseUrl = (value: string | undefined): string | undefined =>
  value?.trim().replace(/\/$/, '') || undefined;

export const resolveCrmparserProxyBaseUrls = (config: CrmparserProxyConfig): string[] => {
  const urls: string[] = [];
  const internalUrl = normalizeBaseUrl(config.internalUrl);
  const baseUrl = normalizeBaseUrl(config.baseUrl);

  if (internalUrl) urls.push(internalUrl);
  if (baseUrl && baseUrl !== internalUrl) urls.push(baseUrl);

  return urls;
};

export const getCrmparserProxyConfig = (): CrmparserProxyConfig | null => {
  const baseUrl = normalizeBaseUrl(process.env.CRMPARSER_API_URL);
  const internalUrl = normalizeBaseUrl(process.env.CRMPARSER_API_INTERNAL_URL);
  const secret = process.env.CRMPARSER_API_SECRET?.trim();
  if ((!baseUrl && !internalUrl) || !secret) return null;
  return {
    baseUrl: baseUrl ?? internalUrl!,
    internalUrl,
    secret,
  };
};

export const isCrmparserProxyConfigured = (): boolean => getCrmparserProxyConfig() !== null;

type CrmparserProxyResult = {
  status: number;
  body: unknown;
};

const readResponseBody = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
};

export const crmparserProxyFetch = async (
  path: string,
  init?: RequestInit,
): Promise<CrmparserProxyResult> => {
  const config = getCrmparserProxyConfig();
  if (!config) {
    return { status: 503, body: { error: 'Crmparser API not configured in app settings' } };
  }

  const baseUrls = resolveCrmparserProxyBaseUrls(config);
  let lastError: string | null = null;

  for (const baseUrl of baseUrls) {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${config.secret}`,
          'Content-Type': 'application/json',
          ...init?.headers,
        },
      });

      const body = await readResponseBody(response);
      if (response.ok || baseUrls.length === 1) {
        return { status: response.status, body };
      }

      lastError =
        typeof body === 'object' && body && 'error' in body
          ? String((body as { error?: unknown }).error)
          : `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Crmparser proxy fetch failed';
    }
  }

  return {
    status: 503,
    body: {
      error: lastError ?? 'Crmparser proxy fetch failed',
    },
  };
};

export const jsonProxyResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
