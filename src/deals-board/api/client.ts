import { CoreApiClient } from 'twenty-client-sdk/core';

let client: CoreApiClient | null = null;

export const getApiClient = (): CoreApiClient => {
  if (!client) client = new CoreApiClient();
  return client;
};
