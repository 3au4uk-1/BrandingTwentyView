import { useLayoutEffect, useState, type RefObject } from 'react';

export type AnchoredFixedBox = {
  top: number;
  left: number;
  width: number;
};

const MENU_GAP_PX = 6;

const readAnchorBox = (anchor: HTMLElement): AnchoredFixedBox => {
  const rect = anchor.getBoundingClientRect();
  return {
    top: rect.bottom + MENU_GAP_PX,
    left: rect.left,
    width: rect.width,
  };
};

const sameBox = (prev: AnchoredFixedBox | null, next: AnchoredFixedBox): boolean =>
  prev !== null && prev.top === next.top && prev.left === next.left && prev.width === next.width;

/**
 * Viewport box for a menu portaled out of an overflow scroller.
 * Tracks the trigger while that scroller moves or the window resizes.
 */
export const useAnchoredFixedBox = (
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
): AnchoredFixedBox | null => {
  const [box, setBox] = useState<AnchoredFixedBox | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setBox(null);
      return;
    }

    const update = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const next = readAnchorBox(anchor);
      setBox((prev) => (sameBox(prev, next) ? prev : next));
    };

    update();
    const view = anchorRef.current?.ownerDocument?.defaultView;
    if (!view) return;

    view.addEventListener('resize', update);
    view.addEventListener('scroll', update, true);
    return () => {
      view.removeEventListener('resize', update);
      view.removeEventListener('scroll', update, true);
    };
  }, [open, anchorRef]);

  return box;
};
