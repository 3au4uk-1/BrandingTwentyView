import { Response } from 'twenty-sdk/logic-function';

export type CrmparserProxyConfig = {
  baseUrl: string;
  secret: string;
};

export const getCrmparserProxyConfig = (): CrmparserProxyConfig | null => {
  const baseUrl = process.env.CRMPARSER_API_URL?.trim().replace(/\/$/, '');
  const secret = process.env.CRMPARSER_API_SECRET?.trim();
  if (!baseUrl || !secret) return null;
  return { baseUrl, secret };
};

export const isCrmparserProxyConfigured = (): boolean => getCrmparserProxyConfig() !== null;

type CrmparserProxyResult = {
  status: number;
  body: unknown;
};

export const crmparserProxyFetch = async (
  path: string,
  init?: RequestInit,
): Promise<CrmparserProxyResult> => {
  const config = getCrmparserProxyConfig();
  if (!config) {
    return { status: 503, body: { error: 'Crmparser API not configured in app settings' } };
  }

  const response = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.secret}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { error: text };
    }
  }

  return { status: response.status, body };
};

export const jsonProxyResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
