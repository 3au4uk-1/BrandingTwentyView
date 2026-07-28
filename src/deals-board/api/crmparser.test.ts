import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  addLineItemToList,
  archiveManualLineItem,
  fetchLineItemListStatus,
  fetchLineItemsListStatusBatch,
  isCrmparserConfigured,
  resetListStatusBatcherForTests,
  syncManualLineItem,
} from './crmparser';

describe('crmparser proxy client', () => {
  afterEach(() => {
    resetListStatusBatcherForTests();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
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
    vi.useFakeTimers();
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

    const pending = fetchLineItemListStatus('li-42');
    await vi.advanceTimersByTimeAsync(40);
    await expect(pending).resolves.toBeNull();
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

  it('batches concurrent list-status fetches into one POST', async () => {
    vi.useFakeTimers();
    globalThis.process = {
      env: {
        TWENTY_FUNCTIONS_URL: 'https://twenty.test/functions',
        TWENTY_APP_ACCESS_TOKEN: 'app-token',
      },
    } as NodeJS.Process;

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        statuses: {
          'li-1': {
            known: true,
            blacklisted: false,
            restorationMatch: true,
            podryadMatch: false,
            bannerMatch: false,
            pattern: 'a',
            dealId: 1,
            dealTwentyId: 'opp-1',
          },
          'li-2': {
            known: true,
            blacklisted: true,
            restorationMatch: false,
            podryadMatch: false,
            bannerMatch: false,
            pattern: 'b',
            dealId: 1,
            dealTwentyId: 'opp-1',
          },
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const p1 = fetchLineItemListStatus('li-1');
    const p2 = fetchLineItemListStatus('li-2');
    await vi.advanceTimersByTimeAsync(40);
    const [s1, s2] = await Promise.all([p1, p2]);

    expect(s1?.restorationMatch).toBe(true);
    expect(s2?.blacklisted).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://twenty.test/functions/crmparser/line-items/list-status',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ ids: ['li-1', 'li-2'] }),
        headers: expect.objectContaining({
          Authorization: 'Bearer app-token',
        }),
      }),
    );
  });

  it('fetchLineItemsListStatusBatch posts ids directly', async () => {
    globalThis.process = {
      env: {
        TWENTY_FUNCTIONS_URL: 'https://twenty.test/functions',
        TWENTY_APP_ACCESS_TOKEN: 'app-token',
      },
    } as NodeJS.Process;

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        statuses: {
          'li-9': {
            known: false,
            blacklisted: false,
            restorationMatch: false,
            podryadMatch: false,
            bannerMatch: false,
            pattern: null,
            dealId: null,
            dealTwentyId: null,
          },
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const statuses = await fetchLineItemsListStatusBatch(['li-9']);
    expect(statuses['li-9']?.known).toBe(false);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://twenty.test/functions/crmparser/line-items/list-status',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ ids: ['li-9'] }),
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

  it('syncManualLineItem posts payload to logic function', async () => {
    globalThis.process = {
      env: {
        TWENTY_FUNCTIONS_URL: 'https://twenty.test/functions',
        TWENTY_APP_ACCESS_TOKEN: 'app-token',
      },
    } as NodeJS.Process;

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, dealItemId: 7 }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const payload = {
      opportunityId: 'opp-1',
      name: 'Баннер',
      kolichestvo: 2,
      amountMicros: 500_000_000,
      currencyCode: 'RUB',
    };
    const result = await syncManualLineItem('li-42', payload);
    expect(result).toEqual({ success: true, dealItemId: 7 });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://twenty.test/functions/crmparser/line-items/li-42/sync',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    );
  });

  it('archiveManualLineItem posts to logic function archive route', async () => {
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

    await archiveManualLineItem('li-42');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://twenty.test/functions/crmparser/line-items/li-42/archive',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({}),
      }),
    );
  });
});
