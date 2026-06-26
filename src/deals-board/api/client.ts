import { CoreApiClient } from 'twenty-sdk/clients';

let client: CoreApiClient | null = null;

export const getApiClient = (): CoreApiClient => {
  if (!client) client = new CoreApiClient();
  return client;
};
