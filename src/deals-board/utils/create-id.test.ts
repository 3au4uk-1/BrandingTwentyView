import { describe, expect, it, vi } from 'vitest';

import { createId } from './create-id';

describe('createId', () => {
  it('uses crypto.randomUUID when available', () => {
    const spy = vi.spyOn(crypto, 'randomUUID').mockReturnValue('11111111-2222-4333-8444-555555555555');
    expect(createId()).toBe('11111111-2222-4333-8444-555555555555');
    spy.mockRestore();
  });

  it('falls back when randomUUID is missing', () => {
    const original = crypto.randomUUID;
    // Simulate opaque-origin sandbox: crypto exists, randomUUID does not
    Object.defineProperty(crypto, 'randomUUID', {
      configurable: true,
      value: undefined,
    });

    try {
      const id = createId();
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    } finally {
      Object.defineProperty(crypto, 'randomUUID', {
        configurable: true,
        value: original,
      });
    }
  });
});
