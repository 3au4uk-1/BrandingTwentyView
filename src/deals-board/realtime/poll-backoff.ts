const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30_000;

/** 1s, 2s, 4s, … capped at 30s. */
export const computeBackoffDelayMs = (consecutiveFailures: number): number => {
  const attempt = Math.max(1, consecutiveFailures);
  const exponent = Math.min(attempt - 1, 5);
  return Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** exponent);
};
