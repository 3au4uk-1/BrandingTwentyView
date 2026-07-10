import { describe, expect, it } from 'vitest';

import { resolveBoundedHostHeight, type DomLikeElement } from './host-height';

const view = { innerHeight: 900 };

const makeElement = (
  clientHeight: number,
  options?: {
    scrollHeight?: number;
    offsetTop?: number;
    parent?: DomLikeElement | null;
  },
): DomLikeElement => ({
  clientHeight,
  scrollHeight: options?.scrollHeight ?? clientHeight,
  offsetTop: options?.offsetTop ?? 0,
  parentElement: options?.parent ?? null,
  ownerDocument: { defaultView: view },
});

describe('resolveBoundedHostHeight', () => {
  it('uses scroll container client height minus offset within ancestor', () => {
    const scrollHost = makeElement(800, { scrollHeight: 2400 });
    const widgetShell = makeElement(2400, { parent: scrollHost, offsetTop: 48 });
    const root = makeElement(2400, { parent: widgetShell, offsetTop: 0 });

    expect(resolveBoundedHostHeight(root)).toBe(748);
  });

  it('falls back to largest bounded ancestor below viewport', () => {
    const bounded = makeElement(640, { scrollHeight: 640 });
    const root = makeElement(1200, { parent: bounded, offsetTop: 24 });

    expect(resolveBoundedHostHeight(root)).toBe(640);
  });

  it('falls back to viewport minus cumulative offsetTop', () => {
    const autoParent = makeElement(1200, { scrollHeight: 1200, offsetTop: 80 });
    const root = makeElement(1200, { parent: autoParent, offsetTop: 40 });

    expect(resolveBoundedHostHeight(root)).toBe(768);
  });

  it('uses an explicit viewport fallback for Remote DOM refs', () => {
    const root: DomLikeElement = {
      clientHeight: 0,
      scrollHeight: 0,
      offsetTop: 0,
      parentElement: null,
    };

    expect(resolveBoundedHostHeight(root, 900)).toBe(888);
  });

  it('returns zero when no usable height can be resolved', () => {
    const root: DomLikeElement = {
      clientHeight: 0,
      scrollHeight: 0,
      offsetTop: 0,
      parentElement: null,
    };

    expect(resolveBoundedHostHeight(root)).toBe(0);
  });
});
