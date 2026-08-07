import { describe, expect, it } from 'vitest';

import { computeBackoffDelayMs } from './poll-backoff';

describe('computeBackoffDelayMs', () => {
  it('starts at one second', () => {
    expect(computeBackoffDelayMs(0)).toBe(1000);
    expect(computeBackoffDelayMs(1)).toBe(1000);
  });

  it('doubles per consecutive failure', () => {
    expect(computeBackoffDelayMs(2)).toBe(2000);
    expect(computeBackoffDelayMs(3)).toBe(4000);
    expect(computeBackoffDelayMs(4)).toBe(8000);
  });

  it('caps at thirty seconds', () => {
    expect(computeBackoffDelayMs(6)).toBe(30_000);
    expect(computeBackoffDelayMs(50)).toBe(30_000);
  });
});
