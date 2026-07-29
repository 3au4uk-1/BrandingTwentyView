export const getTwentyFunctionsBaseUrl = (): string | null => {
  const env = globalThis.process?.env ?? {};
  const functionsUrl = env.TWENTY_FUNCTIONS_URL?.trim().replace(/\/$/, '');
  if (functionsUrl) return functionsUrl;

  // Self-hosted / local often omit TWENTY_FUNCTIONS_URL — routes live under /s
  const apiUrl = env.TWENTY_API_URL?.trim().replace(/\/$/, '');
  if (apiUrl) return `${apiUrl}/s`;

  return null;
};
