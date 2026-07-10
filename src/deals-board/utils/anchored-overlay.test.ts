import { describe, expect, it } from 'vitest';

import {
  resolveAnchoredOverlayPosition,
  resolveAnchorRectWithinRoot,
  type OverlayElementLike,
} from './anchored-overlay';

const element = (
  values: Partial<OverlayElementLike>,
  parentElement: OverlayElementLike | null = null,
): OverlayElementLike => ({
  offsetTop: 0,
  offsetLeft: 0,
  offsetWidth: 0,
  offsetHeight: 0,
  scrollTop: 0,
  scrollLeft: 0,
  parentElement,
  offsetParent: parentElement,
  ...values,
});

describe('resolveAnchorRectWithinRoot', () => {
  it('accumulates offsets and compensates ancestor scrolling', () => {
    const root = element({ clientWidth: 800, clientHeight: 600 });
    const scroller = element(
      { offsetTop: 100, offsetLeft: 50, scrollTop: 40, scrollLeft: 10 },
      root,
    );
    const anchor = element(
      { offsetTop: 200, offsetLeft: 300, offsetWidth: 22, offsetHeight: 22 },
      scroller,
    );

    expect(resolveAnchorRectWithinRoot(anchor, root)).toEqual({
      top: 260,
      left: 340,
      bottom: 282,
      right: 362,
      width: 22,
      height: 22,
    });
  });

  it('uses offset parents for geometry without double-counting DOM parents', () => {
    const root = element({ clientWidth: 800, clientHeight: 600 });
    const scroller = element(
      { offsetTop: 100, offsetLeft: 50, scrollTop: 40, scrollLeft: 10 },
      root,
    );
    const layoutParent = element(
      { offsetTop: 200, offsetLeft: 150, offsetParent: scroller },
      scroller,
    );
    const anchor = element(
      {
        offsetTop: 10,
        offsetLeft: 20,
        offsetWidth: 22,
        offsetHeight: 22,
        offsetParent: scroller,
      },
      layoutParent,
    );

    expect(resolveAnchorRectWithinRoot(anchor, root)).toEqual({
      top: 70,
      left: 60,
      bottom: 92,
      right: 82,
      width: 22,
      height: 22,
    });
  });
});

describe('resolveAnchoredOverlayPosition', () => {
  it('places the overlay below and right-aligns it with the anchor', () => {
    expect(
      resolveAnchoredOverlayPosition({
        anchorRect: { top: 100, left: 300, bottom: 122, right: 322, width: 22, height: 22 },
        overlayWidth: 196,
        overlayHeight: 180,
        containerWidth: 800,
        containerHeight: 600,
      }),
    ).toEqual({ top: 126, left: 126 });
  });

  it('flips above when there is insufficient space below', () => {
    expect(
      resolveAnchoredOverlayPosition({
        anchorRect: { top: 500, left: 300, bottom: 522, right: 322, width: 22, height: 22 },
        overlayWidth: 196,
        overlayHeight: 180,
        containerWidth: 800,
        containerHeight: 600,
      }),
    ).toEqual({ top: 316, left: 126 });
  });

  it('clamps the horizontal position to the container margin', () => {
    expect(
      resolveAnchoredOverlayPosition({
        anchorRect: { top: 100, left: 20, bottom: 122, right: 42, width: 22, height: 22 },
        overlayWidth: 196,
        overlayHeight: 180,
        containerWidth: 800,
        containerHeight: 600,
      }),
    ).toEqual({ top: 126, left: 8 });
  });

  it('clamps the vertical position when neither side has enough room', () => {
    expect(
      resolveAnchoredOverlayPosition({
        anchorRect: { top: 60, left: 300, bottom: 82, right: 322, width: 22, height: 22 },
        overlayWidth: 196,
        overlayHeight: 100,
        containerWidth: 800,
        containerHeight: 150,
      }),
    ).toEqual({ top: 42, left: 126 });
  });
});
