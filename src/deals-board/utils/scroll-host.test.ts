import { describe, expect, it } from 'vitest';

import { measureDesktopToolbarPin } from './scroll-host';

describe('measureDesktopToolbarPin', () => {
  it('anchors toolbar to scroll wrapper top when available', () => {
    const scrollHost = {
      getBoundingClientRect: () => ({
        top: 48,
        left: 0,
        width: 900,
        height: 700,
        right: 900,
        bottom: 748,
      }),
    };

    const root = {
      getBoundingClientRect: () => ({
        top: 96,
        left: 41,
        width: 882,
        height: 600,
        right: 923,
        bottom: 696,
      }),
    };

    const toolbar = {
      getBoundingClientRect: () => ({
        top: 96,
        left: 41,
        width: 882,
        height: 112,
        right: 923,
        bottom: 208,
      }),
    };

    expect(
      measureDesktopToolbarPin(
        root as HTMLElement,
        toolbar as HTMLElement,
        scrollHost as HTMLElement,
      ),
    ).toEqual({
      top: 48,
      left: 41,
      width: 882,
      height: 112,
    });
  });
});
