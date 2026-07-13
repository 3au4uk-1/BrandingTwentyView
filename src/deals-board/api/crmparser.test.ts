import { afterEach, describe, expect, it, vi } from 'vitest';

import { addLineItemToList, fetchLineItemListStatus, isCrmparserConfigured } from './crmparser';

describe('crmparser proxy client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('isCrmparserConfigured requires TWENTY_FUNCTIONS_URL and TWENTY_APP_ACCESS_TOKEN', () => {
    globalThis.process = {
      env: {
        TWENTY_FUNCTIONS_URL: 'https://twenty.test/functions',
        TWENTY_APP_ACCESS_TOKEN: 'app-token',
      },
    } as NodeJS.Process;

    expect(isCrmparserConfigured()).toBe(true);
  });

  it('returns null list status when proxy env is missing', async () => {
    globalThis.process = { env: {} } as NodeJS.Process;
    await expect(fetchLineItemListStatus('li-1')).resolves.toBeNull();
  });

  it('returns null list status when proxy request fails', async () => {
    globalThis.process = {
      env: {
        TWENTY_FUNCTIONS_URL: 'https://twenty.test/functions',
        TWENTY_APP_ACCESS_TOKEN: 'app-token',
      },
    } as NodeJS.Process;

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Crmparser proxy fetch failed' }),
      }),
    );

    await expect(fetchLineItemListStatus('li-42')).resolves.toBeNull();
  });

  it('returns a helpful message when proxy cannot reach parser', async () => {
    globalThis.process = {
      env: {
        TWENTY_FUNCTIONS_URL: 'https://twenty.test/functions',
        TWENTY_APP_ACCESS_TOKEN: 'app-token',
      },
    } as NodeJS.Process;

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({ error: 'fetch failed' }),
      }),
    );

    await expect(addLineItemToList('li-42', 'podryad')).rejects.toThrow(
      'CRMPARSER_API_INTERNAL_URL',
    );
  });

  it('calls logic function route with app access token', async () => {
    globalThis.process = {
      env: {
        TWENTY_FUNCTIONS_URL: 'https://twenty.test/functions',
        TWENTY_APP_ACCESS_TOKEN: 'app-token',
      },
    } as NodeJS.Process;

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        blacklisted: false,
        restorationMatch: true,
        podryadMatch: false,
        bannerMatch: false,
        pattern: 'test',
        dealId: 1,
        dealTwentyId: 'opp-1',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const status = await fetchLineItemListStatus('li-42');
    expect(status?.restorationMatch).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://twenty.test/functions/crmparser/line-items/li-42/list-status',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer app-token',
        }),
      }),
    );
  });

  it('addLineItemToList posts list name to logic function', async () => {
    globalThis.process = {
      env: {
        TWENTY_FUNCTIONS_URL: 'https://twenty.test/functions',
        TWENTY_APP_ACCESS_TOKEN: 'app-token',
      },
    } as NodeJS.Process;

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await addLineItemToList('li-42', 'restoration');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://twenty.test/functions/crmparser/line-items/li-42/add-to-list',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ list: 'restoration' }),
      }),
    );
  });
});
