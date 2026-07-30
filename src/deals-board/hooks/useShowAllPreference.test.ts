import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  readShowAllPreference,
  showAllPreferenceStorageKey,
  writeShowAllPreference,
} from './useShowAllPreference';

describe('showAll preference storage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('uses a per-view localStorage key', () => {
    expect(showAllPreferenceStorageKey('view-1')).toBe('deals-board-show-all:view-1');
  });

  it('defaults to false when unset or view missing', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    });

    expect(readShowAllPreference(undefined)).toBe(false);
    expect(readShowAllPreference('view-1')).toBe(false);

    writeShowAllPreference('view-1', true);
    expect(readShowAllPreference('view-1')).toBe(true);
    expect(store.get('deals-board-show-all:view-1')).toBe('1');

    writeShowAllPreference('view-1', false);
    expect(readShowAllPreference('view-1')).toBe(false);
  });
});
