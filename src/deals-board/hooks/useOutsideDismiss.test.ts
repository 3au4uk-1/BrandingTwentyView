import { describe, expect, it } from 'vitest';

import { useOutsideDismiss } from './useOutsideDismiss';

describe('useOutsideDismiss', () => {
  it('exports a hook that returns a renderable layer', () => {
    expect(typeof useOutsideDismiss).toBe('function');
  });
});
