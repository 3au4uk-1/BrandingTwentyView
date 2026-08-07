import { afterEach, describe, expect, it, vi } from 'vitest';

import { resolveAccessToken } from './twenty-runtime';

describe('resolveAccessToken', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('prefers host user token over env app token', async () => {
    vi.stubEnv('TWENTY_APP_ACCESS_TOKEN', 'app-token-from-env');
    vi.stubGlobal('frontComponentHostCommunicationApi', {
      requestAccessTokenRefresh: vi.fn().mockResolvedValue('user-token-from-host'),
    });

    await expect(resolveAccessToken()).resolves.toBe('user-token-from-host');
  });

  it('falls back to env token when host refresh is unavailable', async () => {
    vi.stubEnv('TWENTY_APP_ACCESS_TOKEN', 'app-token-from-env');
    vi.stubGlobal('frontComponentHostCommunicationApi', undefined);

    await expect(resolveAccessToken()).resolves.toBe('app-token-from-env');
  });
});
