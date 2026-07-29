import { describe, expect, it } from 'vitest';

import {
  CLEAR_FILTER_SESSION,
  hasFilterSessionOverrides,
  RESET_FILTER_SESSION_TO_VIEW,
} from './clear-filter-session';

describe('hasFilterSessionOverrides', () => {
  it('is false for empty / view-inherit session', () => {
    expect(hasFilterSessionOverrides(undefined)).toBe(false);
    expect(hasFilterSessionOverrides({})).toBe(false);
    expect(hasFilterSessionOverrides(RESET_FILTER_SESSION_TO_VIEW)).toBe(false);
  });

  it('is true when any session key is set (including intentional clears)', () => {
    expect(hasFilterSessionOverrides({ datePreset: null })).toBe(true);
    expect(hasFilterSessionOverrides({ search: '' })).toBe(true);
    expect(hasFilterSessionOverrides({ sessionClauses: [] })).toBe(true);
    expect(hasFilterSessionOverrides(CLEAR_FILTER_SESSION)).toBe(true);
  });
});
