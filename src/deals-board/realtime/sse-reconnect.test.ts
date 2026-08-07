import { describe, expect, it } from 'vitest';

import { computeReconnectDelayMs, MAX_CONSECUTIVE_SSE_FAILURES } from './sse-reconnect';

describe('computeReconnectDelayMs', () => {
  it('uses 1s for the first failure', () => {
    expect(computeReconnectDelayMs(1)).toBe(1000);
  });

  it('doubles up to 30s', () => {
    expect(computeReconnectDelayMs(2)).toBe(2000);
    expect(computeReconnectDelayMs(3)).toBe(4000);
    expect(computeReconnectDelayMs(6)).toBe(30000);
  });

  it('exports a finite failure cap', () => {
    expect(MAX_CONSECUTIVE_SSE_FAILURES).toBe(5);
  });
});
