import { afterEach, describe, expect, it } from 'vitest';

import {
  calibrateBoardClientOrigin,
  clientPointToBoardLocal,
  clientRectToBoardLocal,
  measureHostChromeOrigin,
  resetBoardClientOriginCache,
  resolveBoardClientOrigin,
} from './board-client-origin';

afterEach(() => {
  resetBoardClientOriginCache();
});

describe('measureHostChromeOrigin', () => {
  it('reads left nav width and top bar height from host selectors', () => {
    const nodes: Record<string, { getBoundingClientRect: () => object }> = {
      nav: {
        getBoundingClientRect: () => ({
          left: 0,
          top: 0,
          right: 236,
          bottom: 900,
          width: 236,
          height: 900,
        }),
      },
      header: {
        getBoundingClientRect: () => ({
          left: 236,
          top: 0,
          right: 1400,
          bottom: 52,
          width: 1164,
          height: 52,
        }),
      },
    };

    const origin = measureHostChromeOrigin({
      querySelector: (selector) => {
        if (selector === 'nav') return nodes.nav as unknown as Element;
        if (selector === 'header') return nodes.header as unknown as Element;
        return null;
      },
    });

    expect(origin).toEqual({ x: 236, y: 52 });
  });
});

describe('resolveBoardClientOrigin', () => {
  it('prefers a non-zero root rect', () => {
    const root = {
      getBoundingClientRect: () => ({
        left: 240,
        top: 64,
        right: 1400,
        bottom: 900,
        width: 1160,
        height: 836,
      }),
    };
    expect(resolveBoardClientOrigin(root)).toEqual({ x: 240, y: 64 });
  });

  it('falls back to cached calibration when root reports 0,0', () => {
    calibrateBoardClientOrigin({
      clientX: 300,
      clientY: 120,
      offsetX: 10,
      offsetY: 8,
      targetInRoot: { x: 50, y: 20 },
    });
    // origin = 300-50-10=240, 120-20-8=92
    const root = {
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
        right: 1000,
        bottom: 800,
        width: 1000,
        height: 800,
      }),
    };
    expect(resolveBoardClientOrigin(root)).toEqual({ x: 240, y: 92 });
  });
});

describe('clientPointToBoardLocal / clientRectToBoardLocal', () => {
  it('subtracts the board chrome origin', () => {
    const root = {
      getBoundingClientRect: () => ({
        left: 236,
        top: 52,
        right: 1400,
        bottom: 900,
        width: 1164,
        height: 848,
      }),
    };
    expect(clientPointToBoardLocal({ x: 336, y: 152 }, root)).toEqual({ x: 100, y: 100 });
    expect(
      clientRectToBoardLocal(
        { left: 336, top: 152, right: 376, bottom: 192, width: 40, height: 40 },
        root,
      ),
    ).toEqual({ left: 100, top: 100, right: 140, bottom: 140, width: 40, height: 40 });
  });
});
