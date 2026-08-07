export const MAX_CONSECUTIVE_SSE_FAILURES = 5;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30_000;

export const computeReconnectDelayMs = (consecutiveFailures: number): number => {
  const attempt = Math.max(1, consecutiveFailures);
  const exp = Math.min(attempt - 1, 5);
  return Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** exp);
};
