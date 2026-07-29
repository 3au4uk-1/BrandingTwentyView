import { describe, expect, it } from 'vitest';

import {
  clientPointToRootOffset,
  clientRectToRootOffset,
  measureElementInRoot,
  offsetRelativeToAncestor,
  resolveAnchoredOverlayPosition,
  resolveHoverPreviewPosition,
} from './anchored-overlay';

describe('clientPointToRootOffset', () => {
  it('subtracts root origin from client point', () => {
    const root = {
      getBoundingClientRect: () => ({
        top: 100,
        left: 240,
        bottom: 700,
        right: 1200,
        width: 960,
        height: 600,
      }),
    };
    expect(clientPointToRootOffset({ x: 300, y: 180 }, root)).toEqual({ x: 60, y: 80 });
  });

  it('returns the point unchanged when root is missing', () => {
    expect(clientPointToRootOffset({ x: 12, y: 34 }, null)).toEqual({ x: 12, y: 34 });
  });
});

describe('clientRectToRootOffset', () => {
  it('maps a client rect into root-local coordinates', () => {
    const root = {
      getBoundingClientRect: () => ({
        top: 50,
        left: 200,
        bottom: 650,
        right: 1000,
        width: 800,
        height: 600,
      }),
    };
    expect(
      clientRectToRootOffset(
        { top: 120, left: 260, bottom: 160, right: 300, width: 40, height: 40 },
        root,
      ),
    ).toEqual({ top: 70, left: 60, bottom: 110, right: 100, width: 40, height: 40 });
  });
});

describe('offsetRelativeToAncestor', () => {
  it('sums offsetLeft/offsetTop through offsetParent to the root', () => {
    const root = { offsetLeft: 0, offsetTop: 0, offsetParent: null, parentElement: null };
    const cell = {
      offsetLeft: 80,
      offsetTop: 120,
      offsetParent: root,
      parentElement: root,
      scrollLeft: 0,
      scrollTop: 0,
    };
    const thumb = {
      offsetLeft: 12,
      offsetTop: 4,
      offsetWidth: 40,
      offsetHeight: 40,
      offsetParent: cell,
      parentElement: cell,
    };
    expect(offsetRelativeToAncestor(thumb, root)).toEqual({ x: 92, y: 124 });
  });

  it('returns null when the ancestor is not in the chain', () => {
    const other = { offsetLeft: 0, offsetTop: 0, offsetParent: null };
    const thumb = { offsetLeft: 10, offsetTop: 10, offsetParent: null, parentElement: null };
    expect(offsetRelativeToAncestor(thumb, other)).toBeNull();
  });
});

describe('measureElementInRoot', () => {
  it('builds a root-local box from offsets', () => {
    const root = { offsetLeft: 0, offsetTop: 0, offsetParent: null, parentElement: null };
    const thumb = {
      offsetLeft: 50,
      offsetTop: 30,
      offsetWidth: 40,
      offsetHeight: 40,
      offsetParent: root,
      parentElement: root,
    };
    expect(measureElementInRoot(thumb, root)).toEqual({
      left: 50,
      top: 30,
      width: 40,
      height: 40,
      right: 90,
      bottom: 70,
    });
  });
});

describe('resolveAnchoredOverlayPosition', () => {
  it('places the panel below the anchor when there is room', () => {
    expect(
      resolveAnchoredOverlayPosition({
        anchor: { top: 40, left: 20, bottom: 80, right: 60, width: 40, height: 40 },
        overlayWidth: 220,
        overlayHeight: 180,
        rootWidth: 800,
        rootHeight: 600,
      }),
    ).toEqual({ top: 84, left: 20, transform: undefined });
  });

  it('flips above when the panel would overflow the root bottom', () => {
    expect(
      resolveAnchoredOverlayPosition({
        anchor: { top: 500, left: 20, bottom: 540, right: 60, width: 40, height: 40 },
        overlayWidth: 220,
        overlayHeight: 180,
        rootWidth: 800,
        rootHeight: 600,
      }),
    ).toEqual({ top: 496, left: 20, transform: 'translateY(-100%)' });
  });

  it('prefers above when requested', () => {
    expect(
      resolveAnchoredOverlayPosition({
        anchor: { top: 200, left: 20, bottom: 240, right: 60, width: 40, height: 40 },
        overlayWidth: 220,
        overlayHeight: 180,
        rootWidth: 800,
        rootHeight: 600,
        preferAbove: true,
      }),
    ).toEqual({ top: 196, left: 20, transform: 'translateY(-100%)' });
  });

  it('clamps horizontally inside the root', () => {
    expect(
      resolveAnchoredOverlayPosition({
        anchor: { top: 40, left: 700, bottom: 80, right: 740, width: 40, height: 40 },
        overlayWidth: 220,
        overlayHeight: 100,
        rootWidth: 800,
        rootHeight: 600,
        margin: 8,
      }),
    ).toEqual({ top: 84, left: 572, transform: undefined });
  });
});

describe('resolveHoverPreviewPosition', () => {
  it('places the preview to the right of the thumb', () => {
    expect(
      resolveHoverPreviewPosition(
        { top: 100, left: 40, bottom: 140, right: 80, width: 40, height: 40 },
        280,
        800,
        600,
      ),
    ).toEqual({ top: 100, left: 88 });
  });
});
