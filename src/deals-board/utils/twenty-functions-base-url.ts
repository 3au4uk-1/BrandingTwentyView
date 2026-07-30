/** Strip trailing slash and optional `/graphql` suffix from Twenty API URLs. */
export const normalizeTwentyApiOrigin = (apiUrl: string): string =>
  apiUrl
    .trim()
    .replace(/\/$/, '')
    .replace(/\/graphql$/i, '');

export const getTwentyFunctionsBaseUrl = (): string | null => {
  const env = globalThis.process?.env ?? {};
  const functionsUrl = env.TWENTY_FUNCTIONS_URL?.trim().replace(/\/$/, '');
  if (functionsUrl) return functionsUrl;

  // Self-hosted / local often omit TWENTY_FUNCTIONS_URL — routes live under /s
  const apiUrl = env.TWENTY_API_URL?.trim();
  if (apiUrl) return `${normalizeTwentyApiOrigin(apiUrl)}/s`;

  return null;
};
