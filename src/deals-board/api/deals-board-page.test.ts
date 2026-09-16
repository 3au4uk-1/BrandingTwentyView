import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  assembleDealsBoardPageFromLegacy,
  fetchDealsBoardPage,
  fetchLegacyDealsBoardPage,
} from './deals-board-page';
import { fetchLineItemsByOpportunityIds } from './line-items';
import { fetchChildOpportunitiesByParentIds, fetchOpportunities } from './opportunities';

vi.mock('./opportunities', () => ({
  fetchOpportunities: vi.fn(),
  fetchChildOpportunitiesByParentIds: vi.fn(async () => []),
}));

vi.mock('./line-items', () => ({
  fetchLineItemsByOpportunityIds: vi.fn(),
}));

describe('assembleDealsBoardPageFromLegacy', () => {
  it('maps opportunities and line items into DealsBoardPageResponse', () => {
    expect(
      assembleDealsBoardPageFromLegacy(
        {
          records: [
            { id: 'o1', name: 'Deal 1' },
            { id: 'o2', name: 'Deal 2' },
          ],
          totalCount: 42,
        },
        [
          { id: 'l1', opportunityId: 'o1' },
          { id: 'l2', opportunityId: 'o1' },
          { id: 'l3', opportunityId: 'o2' },
        ],
        { l1: { blacklisted: true } },
      ),
    ).toEqual({
      opportunities: [
        { id: 'o1', name: 'Deal 1' },
        { id: 'o2', name: 'Deal 2' },
      ],
      totalCount: 42,
      lineItemsByOppId: {
        o1: [
          { id: 'l1', opportunityId: 'o1' },
          { id: 'l2', opportunityId: 'o1' },
        ],
        o2: [{ id: 'l3', opportunityId: 'o2' }],
      },
      listStatusByLineItemId: { l1: { blacklisted: true } },
    });
  });

  it('omits listStatusByLineItemId when empty', () => {
    expect(
      assembleDealsBoardPageFromLegacy({ records: [], totalCount: 0 }, [], {}),
    ).toEqual({
      opportunities: [],
      totalCount: 0,
      lineItemsByOppId: {},
    });
  });
});

describe('fetchDealsBoardPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const request = {
    limit: 50,
    offset: 0,
    orderBy: [{ loadDate: 'AscNullsFirst' }],
    visibleCrmFieldNames: ['loadDate', 'stage', 'amount'],
    includeCompanyRelation: true,
    restFieldNames: [],
    includeListStatus: false,
  };

  it('returns LF payload on success', async () => {
    globalThis.process = {
      env: {
        TWENTY_FUNCTIONS_URL: 'https://twenty.test/functions',
        TWENTY_APP_ACCESS_TOKEN: 'app-token',
      },
    } as NodeJS.Process;

    const payload = {
      opportunities: [{ id: 'o1' }],
      totalCount: 1,
      lineItemsByOppId: { o1: [{ id: 'l1', opportunityId: 'o1' }] },
    };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => payload,
      }),
    );

    const legacy = vi.fn();
    await expect(fetchDealsBoardPage(request, legacy)).resolves.toEqual(payload);
    expect(legacy).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith(
      'https://twenty.test/functions/deals-board/page',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer app-token',
        }),
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('falls back when aggregate fetch aborts (timeout)', async () => {
    globalThis.process = {
      env: {
        TWENTY_FUNCTIONS_URL: 'https://twenty.test/functions',
        TWENTY_APP_ACCESS_TOKEN: 'app-token',
      },
    } as NodeJS.Process;

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          const signal = init?.signal;
          if (!signal) {
            reject(new Error('expected AbortSignal'));
            return;
          }
          if (signal.aborted) {
            reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
            return;
          }
          signal.addEventListener('abort', () => {
            reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
          });
        });
      }),
    );

    const legacyPayload = {
      opportunities: [{ id: 'o-legacy' }],
      totalCount: 1,
      lineItemsByOppId: {},
    };
    const legacy = vi.fn().mockResolvedValue(legacyPayload);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(fetchDealsBoardPage(request, legacy)).resolves.toEqual(legacyPayload);
    expect(legacy).toHaveBeenCalledOnce();
    expect(warnSpy).toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith(
      'https://twenty.test/functions/deals-board/page',
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('falls back on 404 (undeployed LF)', async () => {
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
        status: 404,
        json: async () => ({ error: 'not found' }),
      }),
    );

    const legacyPayload = {
      opportunities: [{ id: 'o-legacy' }],
      totalCount: 1,
      lineItemsByOppId: {},
    };
    const legacy = vi.fn().mockResolvedValue(legacyPayload);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(fetchDealsBoardPage(request, legacy)).resolves.toEqual(legacyPayload);
    expect(legacy).toHaveBeenCalledOnce();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('falls back when proxy is not configured', async () => {
    globalThis.process = { env: {} } as NodeJS.Process;

    const legacyPayload = {
      opportunities: [{ id: 'o-legacy' }],
      totalCount: 1,
      lineItemsByOppId: {},
    };
    const legacy = vi.fn().mockResolvedValue(legacyPayload);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(fetchDealsBoardPage(request, legacy)).resolves.toEqual(legacyPayload);
    expect(legacy).toHaveBeenCalledOnce();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('falls back on 503', async () => {
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
        json: async () => ({ error: 'deals-board page failed' }),
      }),
    );

    const legacyPayload = {
      opportunities: [{ id: 'o-legacy' }],
      totalCount: 1,
      lineItemsByOppId: {},
    };
    const legacy = vi.fn().mockResolvedValue(legacyPayload);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(fetchDealsBoardPage(request, legacy)).resolves.toEqual(legacyPayload);
    expect(legacy).toHaveBeenCalledOnce();
    expect(warnSpy).toHaveBeenCalledWith(
      '[deals-board-page] falling back to multi-call path',
      expect.any(Error),
    );
  });

  it('rethrows non-fallbackable 400 errors', async () => {
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
        status: 400,
        json: async () => ({ error: 'invalid deals-board page request' }),
      }),
    );

    const legacy = vi.fn();
    await expect(fetchDealsBoardPage(request, legacy)).rejects.toThrow(
      'invalid deals-board page request',
    );
    expect(legacy).not.toHaveBeenCalled();
  });
});

describe('fetchLegacyDealsBoardPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('assembles legacy multi-call response without list status', async () => {
    vi.mocked(fetchOpportunities).mockResolvedValue({
      records: [{ id: 'o1', name: 'Deal 1' }],
      totalCount: 1,
    });
    vi.mocked(fetchChildOpportunitiesByParentIds).mockResolvedValue([]);
    vi.mocked(fetchLineItemsByOpportunityIds).mockResolvedValue([
      { id: 'l1', opportunityId: 'o1', name: 'Item 1' } as never,
    ]);

    const result = await fetchLegacyDealsBoardPage(
      {
        limit: 50,
        offset: 0,
        orderBy: [{ loadDate: 'AscNullsFirst' }],
        visibleCrmFieldNames: ['loadDate'],
        includeCompanyRelation: true,
        restFieldNames: [],
        includeListStatus: true,
      },
      {
        sort: [{ field: 'loadDate', direction: 'AscNullsFirst' }],
        filters: { datePreset: 'future' },
      },
    );

    expect(fetchOpportunities).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 50,
        offset: 0,
        filters: { datePreset: 'future' },
      }),
    );
    expect(fetchChildOpportunitiesByParentIds).toHaveBeenCalledWith(['o1']);
    expect(fetchLineItemsByOpportunityIds).toHaveBeenCalledWith(['o1'], undefined);
    expect(result).toEqual({
      opportunities: [{ id: 'o1', name: 'Deal 1' }],
      totalCount: 1,
      lineItemsByOppId: {
        o1: [{ id: 'l1', opportunityId: 'o1', name: 'Item 1' }],
      },
    });
  });
});
