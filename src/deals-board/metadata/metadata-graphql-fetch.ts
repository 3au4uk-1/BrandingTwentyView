type MetadataGraphqlResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

export const getMetadataApiConfig = (): { apiUrl: string; accessToken: string } => {
  const apiUrl = process.env.TWENTY_API_URL;
  const accessToken =
    process.env.TWENTY_APP_ACCESS_TOKEN ?? process.env.TWENTY_API_KEY;

  if (!apiUrl || !accessToken) {
    throw new Error(
      'TWENTY_API_URL and TWENTY_APP_ACCESS_TOKEN (or TWENTY_API_KEY) must be set',
    );
  }

  return { apiUrl: apiUrl.replace(/\/$/, ''), accessToken };
};

export const queryMetadataGraphql = async <T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> => {
  const { apiUrl, accessToken } = getMetadataApiConfig();
  const response = await fetch(`${apiUrl}/metadata`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `Metadata API returned ${response.status}${text ? `: ${text}` : ''}`,
    );
  }

  const body = (await response.json()) as MetadataGraphqlResponse<T>;
  if (body.errors?.length) {
    throw new Error(body.errors.map((error) => error.message).join('; '));
  }
  if (!body.data) {
    throw new Error('Metadata API returned empty data');
  }

  return body.data;
};
