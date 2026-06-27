import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('twenty-client-sdk/rest', () => ({
  RestApiClient: vi.fn(),
}));

import { RestApiClient } from 'twenty-client-sdk/rest';

import { enrichOpportunityRowsWithLinkFields } from './opportunity-link-fields-rest';

describe('enrichOpportunityRowsWithLinkFields', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    const records = await enrichOpportunityRowsWithLinkFields(
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

  it('returns rows unchanged when no link fields are requested', async () => {
    const records = [{ id: 'opp-1', name: 'Deal 1' }];
    await expect(enrichOpportunityRowsWithLinkFields(records, [])).resolves.toBe(records);
    expect(RestApiClient).not.toHaveBeenCalled();
  });
});
