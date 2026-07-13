import { describe, expect, it } from 'vitest';

import { MOBILE_BREAKPOINT, resolveLayoutMode } from './layout-mode';

describe('resolveLayoutMode', () => {
  it('returns mobile below breakpoint', () => {
    expect(resolveLayoutMode(MOBILE_BREAKPOINT - 1)).toBe('mobile');
    expect(resolveLayoutMode(375)).toBe('mobile');
  });

  it('returns desktop at or above breakpoint', () => {
    expect(resolveLayoutMode(MOBILE_BREAKPOINT)).toBe('desktop');
    expect(resolveLayoutMode(1024)).toBe('desktop');
  });

  it('returns desktop when width is 0 (not yet measured)', () => {
    expect(resolveLayoutMode(0)).toBe('desktop');
  });
});
