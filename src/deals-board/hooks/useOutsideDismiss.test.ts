import { describe, expect, it } from 'vitest';

import { useOutsideDismiss } from './useOutsideDismiss';

describe('useOutsideDismiss', () => {
  it('exports a hook function', () => {
    expect(typeof useOutsideDismiss).toBe('function');
  });
});
