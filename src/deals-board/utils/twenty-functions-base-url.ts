export const getTwentyFunctionsBaseUrl = (): string | null => {
  const base = globalThis.process?.env?.TWENTY_FUNCTIONS_URL?.trim().replace(/\/$/, '');
  return base || null;
};
