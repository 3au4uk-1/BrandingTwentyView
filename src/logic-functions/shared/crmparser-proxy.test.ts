import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  crmparserProxyFetch,
  getCrmparserProxyConfig,
  isCrmparserProxyConfigured,
  resolveCrmparserProxyBaseUrls,
} from './crmparser-proxy';

describe('crmparser-proxy', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('returns null when server variables are missing', () => {
    vi.stubEnv('CRMPARSER_API_URL', '');
    vi.stubEnv('CRMPARSER_API_INTERNAL_URL', '');
    vi.stubEnv('CRMPARSER_API_SECRET', '');
    expect(isCrmparserProxyConfigured()).toBe(false);
    expect(getCrmparserProxyConfig()).toBeNull();
  });

  it('prefers internal docker url before public url', () => {
    expect(
      resolveCrmparserProxyBaseUrls({
        baseUrl: 'https://parser.test/api',
        internalUrl: 'http://crmparser:3000/api',
        secret: 'secret',
      }),
    ).toEqual(['http://crmparser:3000/api', 'https://parser.test/api']);
  });

  it('falls back to public url when internal fetch fails', async () => {
    vi.stubEnv('CRMPARSER_API_URL', 'https://parser.test/api');
    vi.stubEnv('CRMPARSER_API_INTERNAL_URL', 'http://crmparser:3000/api');
    vi.stubEnv('CRMPARSER_API_SECRET', 'secret');

    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('fetch failed'))
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ success: true }),
      });
    vi.stubGlobal('fetch', fetchMock);

    await expect(crmparserProxyFetch('/twenty/line-items/li-1/add-to-list')).resolves.toEqual({
      status: 200,
      body: { success: true },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'http://crmparser:3000/api/twenty/line-items/li-1/add-to-list',
    );
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      'https://parser.test/api/twenty/line-items/li-1/add-to-list',
    );
  });

  it('returns 503 when all upstream urls fail', async () => {
    vi.stubEnv('CRMPARSER_API_URL', 'https://parser.test/api');
    vi.stubEnv('CRMPARSER_API_SECRET', 'secret');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fetch failed')));

    await expect(crmparserProxyFetch('/twenty/line-items/li-1/list-status')).resolves.toEqual({
      status: 503,
      body: { error: 'fetch failed' },
    });
  });
});
