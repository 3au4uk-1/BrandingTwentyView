import { describe, expect, it } from 'vitest';

import { MOBILE_BREAKPOINT, resolveLayoutMode } from './layout-mode';
import {
  resolveLayoutEffectiveWidth,
  resolveViewportWidth,
} from './viewport-width';

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

  it('forces mobile when prefersMobile is true even with wide width', () => {
    expect(resolveLayoutMode(1280, { prefersMobile: true })).toBe('mobile');
  });
});

describe('resolveLayoutEffectiveWidth', () => {
  it('uses the smaller of container and viewport widths', () => {
    expect(resolveLayoutEffectiveWidth(1200, 390)).toBe(390);
    expect(resolveLayoutEffectiveWidth(600, 1024)).toBe(600);
  });

  it('falls back to whichever width is available', () => {
    expect(resolveLayoutEffectiveWidth(0, 390)).toBe(390);
    expect(resolveLayoutEffectiveWidth(1200, 0)).toBe(1200);
  });
});

describe('resolveViewportWidth', () => {
  it('returns the minimum candidate width', () => {
    expect(resolveViewportWidth([390, 1280, 414])).toBe(390);
  });
});
