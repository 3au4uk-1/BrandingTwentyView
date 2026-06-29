const APP_ACCESS_TOKEN_ENV_KEY = 'TWENTY_APP_ACCESS_TOKEN';
const API_KEY_ENV_KEY = 'TWENTY_API_KEY';

const readProcessEnv = (): Record<string, string | undefined> =>
  globalThis.process?.env ?? {};

export const resolveTwentyApiBaseUrl = (): string => {
  const baseUrl = readProcessEnv().TWENTY_API_URL?.trim();
  if (!baseUrl) {
    throw new Error('Missing TWENTY_API_URL');
  }

  return baseUrl.replace(/\/+$/, '');
};

export const getMetadataGraphqlUrl = (): string => `${resolveTwentyApiBaseUrl()}/metadata`;

export const readAccessTokenFromEnv = (): string | null => {
  const env = readProcessEnv();
  return env[APP_ACCESS_TOKEN_ENV_KEY] ?? env[API_KEY_ENV_KEY] ?? null;
};

export const resolveAccessToken = async (): Promise<string> => {
  const tokenFromEnv = readAccessTokenFromEnv();
  if (tokenFromEnv) return tokenFromEnv;

  const refresh = globalThis.frontComponentHostCommunicationApi?.requestAccessTokenRefresh;
  if (typeof refresh === 'function') {
    const refreshedToken = await refresh();
    if (typeof refreshedToken === 'string' && refreshedToken.length > 0) {
      return refreshedToken;
    }
  }

  throw new Error('Missing Twenty access token');
};
