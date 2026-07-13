import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  crmparserProxyFetch,
  getCrmparserProxyConfig,
  isCrmparserProxyConfigured,
} from './crmparser-proxy';

describe('crmparser-proxy', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns null when server variables are missing', () => {
    vi.stubEnv('CRMPARSER_API_URL', '');
    vi.stubEnv('CRMPARSER_API_SECRET', '');
    expect(isCrmparserProxyConfigured()).toBe(false);
    expect(getCrmparserProxyConfig()).toBeNull();
  });

  it('returns 503 when upstream fetch fails', async () => {
    vi.stubEnv('CRMPARSER_API_URL', 'https://parser.test/api');
    vi.stubEnv('CRMPARSER_API_SECRET', 'secret');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fetch failed')));

    await expect(crmparserProxyFetch('/twenty/line-items/li-1/list-status')).resolves.toEqual({
      status: 503,
      body: { error: 'fetch failed' },
    });
  });
});
