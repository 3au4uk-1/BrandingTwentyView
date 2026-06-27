import { afterEach, describe, expect, it, vi } from 'vitest';

import { getMetadataApiConfig, queryMetadataGraphql } from './metadata-graphql-fetch';

describe('getMetadataApiConfig', () => {
  afterEach(() => {
    delete process.env.TWENTY_API_URL;
    delete process.env.TWENTY_APP_ACCESS_TOKEN;
    delete process.env.TWENTY_API_KEY;
  });

  it('prefers TWENTY_APP_ACCESS_TOKEN over TWENTY_API_KEY', () => {
    process.env.TWENTY_API_URL = 'https://crm.example.com/';
    process.env.TWENTY_APP_ACCESS_TOKEN = 'app-token';
    process.env.TWENTY_API_KEY = 'api-key';

    expect(getMetadataApiConfig()).toEqual({
      apiUrl: 'https://crm.example.com',
      accessToken: 'app-token',
    });
  });

  it('throws when credentials are missing', () => {
    process.env.TWENTY_API_URL = 'https://crm.example.com';
    expect(() => getMetadataApiConfig()).toThrow(/TWENTY_APP_ACCESS_TOKEN/);
  });
});

describe('queryMetadataGraphql', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.TWENTY_API_URL;
    delete process.env.TWENTY_APP_ACCESS_TOKEN;
  });

  it('posts to /metadata with bearer token', async () => {
    process.env.TWENTY_API_URL = 'https://crm.example.com';
    process.env.TWENTY_APP_ACCESS_TOKEN = 'app-token';

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { objects: { edges: [] } } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await queryMetadataGraphql('query { objects { edges { node { id } } } }', {
      filter: {},
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://crm.example.com/metadata',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer app-token',
        },
      }),
    );
  });
});
