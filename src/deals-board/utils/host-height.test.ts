import { describe, expect, it } from 'vitest';

import {
  getRootOffsetWithinAncestor,
  isPageLayoutScrollWrapper,
  resolveBoundedHostHeight,
  type DomLikeElement,
} from './host-height';

const view = { innerHeight: 900 };

const makeElement = (
  clientHeight: number,
  options?: {
    id?: string;
    scrollHeight?: number;
    scrollTop?: number;
    offsetTop?: number;
    parent?: DomLikeElement | null;
    top?: number;
    ancestorTop?: number;
  },
): DomLikeElement => ({
  id: options?.id,
  clientHeight,
  scrollHeight: options?.scrollHeight ?? clientHeight,
  scrollTop: options?.scrollTop ?? 0,
  offsetTop: options?.offsetTop ?? 0,
  parentElement: options?.parent ?? null,
  ownerDocument: { defaultView: view },
  getBoundingClientRect:
    typeof options?.top === 'number'
      ? () => ({ top: options.top, bottom: options.top! + clientHeight, height: clientHeight })
      : undefined,
});

describe('isPageLayoutScrollWrapper', () => {
  it('matches Twenty page layout scroll wrapper ids', () => {
    expect(
      isPageLayoutScrollWrapper({
        id: 'scroll-wrapper-scroll-wrapper-page-layout-f3d59800-9571-491c-bbbe-6f53096d7ede',
      }),
    ).toBe(true);
  });
});

describe('getRootOffsetWithinAncestor', () => {
  it('uses bounding rects when offsetTop is unavailable', () => {
    const scrollHost = makeElement(800, {
      id: 'scroll-wrapper-scroll-wrapper-page-layout-test',
      top: 40,
      ancestorTop: 40,
    });
    const root = makeElement(2400, { parent: scrollHost, top: 88 });

    expect(getRootOffsetWithinAncestor(root, scrollHost)).toBe(48);
  });
});

describe('resolveBoundedHostHeight', () => {
  it('uses scroll container client height minus offset within ancestor', () => {
    const scrollHost = makeElement(800, { scrollHeight: 2400 });
    const widgetShell = makeElement(2400, { parent: scrollHost, offsetTop: 48 });
    const root = makeElement(2400, { parent: widgetShell, offsetTop: 0 });

    expect(resolveBoundedHostHeight(root)).toBe(748);
  });

  it('prefers Twenty page layout scroll wrapper by id', () => {
    const scrollHost = makeElement(720, {
      id: 'scroll-wrapper-scroll-wrapper-page-layout-test',
      scrollHeight: 720,
      top: 32,
    });
    const widgetShell = makeElement(720, { parent: scrollHost, offsetTop: 16, top: 48 });
    const root = makeElement(720, { parent: widgetShell, offsetTop: 0, top: 48 });

    expect(resolveBoundedHostHeight(root)).toBe(700);
  });

  it('falls back to largest bounded ancestor below viewport', () => {
    const bounded = makeElement(640, { scrollHeight: 640 });
    const root = makeElement(1200, { parent: bounded, offsetTop: 24 });

    expect(resolveBoundedHostHeight(root)).toBe(640);
  });

  it('falls back to viewport minus root top from bounding rect', () => {
    const root = makeElement(1200, { top: 112 });

    expect(resolveBoundedHostHeight(root)).toBe(776);
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
