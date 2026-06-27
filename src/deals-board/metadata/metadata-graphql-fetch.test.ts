import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('twenty-client-sdk/rest', () => ({
  RestApiClient: vi.fn(),
}));

import { RestApiClient } from 'twenty-client-sdk/rest';

import { queryMetadataGraphql } from './metadata-graphql-fetch';

describe('queryMetadataGraphql', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('posts GraphQL query via RestApiClient to /metadata', async () => {
    const post = vi.fn().mockResolvedValue({
      data: { objects: { edges: [] } },
    });
    vi.mocked(RestApiClient).mockImplementation(
      () =>
        ({
          post,
        }) as unknown as RestApiClient,
    );

    await queryMetadataGraphql('query { objects { edges { node { id } } } }', {
      paging: { first: 1 },
    });

    expect(post).toHaveBeenCalledWith('/metadata', {
      query: 'query { objects { edges { node { id } } } }',
      variables: { paging: { first: 1 } },
    });
  });

  it('throws when GraphQL returns errors', async () => {
    const post = vi.fn().mockResolvedValue({
      errors: [{ message: 'Forbidden' }],
    });
    vi.mocked(RestApiClient).mockImplementation(
      () =>
        ({
          post,
        }) as unknown as RestApiClient,
    );

    await expect(queryMetadataGraphql('query { objects { edges { node { id } } } }')).rejects.toThrow(
      'Forbidden',
    );
  });
});
