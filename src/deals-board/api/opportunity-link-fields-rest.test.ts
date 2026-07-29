import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('twenty-client-sdk/rest', () => ({
  RestApiClient: vi.fn(),
}));

import { RestApiClient } from 'twenty-client-sdk/rest';

import {
  enrichOpportunityRowsWithRestFields,
  resetOpportunityRestClientForTests,
} from './opportunity-link-fields-rest';

describe('enrichOpportunityRowsWithRestFields', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetOpportunityRestClientForTests();
  });

  it('merges Tony and Bitrix links from REST into GraphQL rows', async () => {
    const get = vi.fn().mockResolvedValue({
      data: {
        opportunities: [
          {
            id: 'opp-1',
            tonyLink: { primaryLinkUrl: 'https://tony.example/1' },
            bitrixLink: { primaryLinkUrl: 'https://bitrix.example/1' },
          },
        ],
      },
    });

    vi.mocked(RestApiClient).mockImplementation(
      () =>
        ({
          get,
        }) as unknown as RestApiClient,
    );

    const records = await enrichOpportunityRowsWithRestFields(
      [{ id: 'opp-1', name: 'Deal 1' }],
      ['tonyLink', 'bitrixLink'],
    );

    expect(get).toHaveBeenCalledWith('/rest/opportunities', {
      query: {
        limit: 1,
        filter: 'id[in]:["opp-1"]',
      },
    });
    expect(records[0]).toMatchObject({
      id: 'opp-1',
      name: 'Deal 1',
      tonyLink: { primaryLinkUrl: 'https://tony.example/1' },
      bitrixLink: { primaryLinkUrl: 'https://bitrix.example/1' },
    });
  });

  it('merges custom REST-only fields into GraphQL rows', async () => {
    const get = vi.fn().mockResolvedValue({
      data: {
        opportunities: [
          {
            id: 'opp-1',
            summaPostupleniy: { amountMicros: 1_500_000_000, currencyCode: 'RUB' },
          },
        ],
      },
    });

    vi.mocked(RestApiClient).mockImplementation(
      () =>
        ({
          get,
        }) as unknown as RestApiClient,
    );

    const records = await enrichOpportunityRowsWithRestFields(
      [{ id: 'opp-1', name: 'Deal 1' }],
      ['summaPostupleniy'],
    );

    expect(records[0]).toMatchObject({
      summaPostupleniy: { amountMicros: 1_500_000_000, currencyCode: 'RUB' },
    });
  });

  it('returns rows unchanged when no REST fields are requested', async () => {
    const records = [{ id: 'opp-1', name: 'Deal 1' }];
    await expect(enrichOpportunityRowsWithRestFields(records, [])).resolves.toBe(records);
    expect(RestApiClient).not.toHaveBeenCalled();
  });

  it('fetches REST chunks in parallel when more than one chunk is needed', async () => {
    type Deferred<T> = {
      promise: Promise<T>;
      resolve: (value: T) => void;
    };

    const createDeferred = <T>(): Deferred<T> => {
      let resolve!: (value: T) => void;
      const promise = new Promise<T>((res) => {
        resolve = res;
      });
      return { promise, resolve };
    };

    const chunk0 = createDeferred<{
      data: {
        opportunities: Array<{ id: string; tonyLink: { primaryLinkUrl: string } }>;
      };
    }>();
    const chunk1 = createDeferred<{
      data: {
        opportunities: Array<{ id: string; tonyLink: { primaryLinkUrl: string } }>;
      };
    }>();

    const get = vi
      .fn()
      .mockImplementationOnce(() => chunk0.promise)
      .mockImplementationOnce(() => chunk1.promise);

    vi.mocked(RestApiClient).mockImplementation(
      () =>
        ({
          get,
        }) as unknown as RestApiClient,
    );

    const records = Array.from({ length: 51 }, (_, index) => ({
      id: `opp-${index + 1}`,
      name: `Deal ${index + 1}`,
    }));

    const enrichmentPromise = enrichOpportunityRowsWithRestFields(records, ['tonyLink']);

    expect(get).toHaveBeenCalledTimes(2);

    chunk0.resolve({
      data: {
        opportunities: Array.from({ length: 50 }, (_, index) => ({
          id: `opp-${index + 1}`,
          tonyLink: { primaryLinkUrl: `https://tony.example/${index + 1}` },
        })),
      },
    });
    chunk1.resolve({
      data: {
        opportunities: [
          { id: 'opp-51', tonyLink: { primaryLinkUrl: 'https://tony.example/51' } },
        ],
      },
    });

    const enriched = await enrichmentPromise;

    expect(enriched[0]).toMatchObject({
      id: 'opp-1',
      tonyLink: { primaryLinkUrl: 'https://tony.example/1' },
    });
    expect(enriched[50]).toMatchObject({
      id: 'opp-51',
      tonyLink: { primaryLinkUrl: 'https://tony.example/51' },
    });
  });
});
