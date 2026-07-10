import { afterEach, describe, expect, it, vi } from 'vitest';

import {
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

  it('normalizes base url and reads secret', () => {
    vi.stubEnv('CRMPARSER_API_URL', 'https://parser.test/api/');
    vi.stubEnv('CRMPARSER_API_SECRET', 'secret');
    expect(getCrmparserProxyConfig()).toEqual({
      baseUrl: 'https://parser.test/api',
      secret: 'secret',
    });
  });
});
