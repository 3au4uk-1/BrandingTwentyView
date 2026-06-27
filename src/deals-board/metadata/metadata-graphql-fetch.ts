import { RestApiClient } from 'twenty-client-sdk/rest';

type MetadataGraphqlResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

export const queryMetadataGraphql = async <T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> => {
  const client = new RestApiClient();
  const body = await client.post<MetadataGraphqlResponse<T>>('/metadata', {
    query,
    variables,
  });

  if (body.errors?.length) {
    throw new Error(body.errors.map((error) => error.message).join('; '));
  }
  if (!body.data) {
    throw new Error('Metadata API returned empty data');
  }

  return body.data;
};
