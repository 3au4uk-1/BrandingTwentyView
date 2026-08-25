import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  readTypeSectionsEnabled,
  TYPE_SECTIONS_STORAGE_KEY,
  writeTypeSectionsEnabled,
} from './useTypeSections';

describe('type sections preference storage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('defaults to false when unset or invalid', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    });

    expect(TYPE_SECTIONS_STORAGE_KEY).toBe('deals-board-type-sections');
    expect(readTypeSectionsEnabled()).toBe(false);

    store.set(TYPE_SECTIONS_STORAGE_KEY, 'invalid');
    expect(readTypeSectionsEnabled()).toBe(false);
  });

  it("writing 'on' persists", () => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    });

    writeTypeSectionsEnabled(true);
    expect(store.get(TYPE_SECTIONS_STORAGE_KEY)).toBe('on');
    expect(readTypeSectionsEnabled()).toBe(true);

    writeTypeSectionsEnabled(false);
    expect(store.get(TYPE_SECTIONS_STORAGE_KEY)).toBe('off');
    expect(readTypeSectionsEnabled()).toBe(false);
  });
});
