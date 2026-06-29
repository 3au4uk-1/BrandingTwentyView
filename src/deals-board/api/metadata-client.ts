import { MetadataApiClient } from 'twenty-client-sdk/metadata';

let client: MetadataApiClient | null = null;

export const getMetadataClient = (): MetadataApiClient => {
  if (!client) client = new MetadataApiClient();
  return client;
};
