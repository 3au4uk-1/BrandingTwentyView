import { useLayoutEffect, useState, type RefObject } from 'react';

import {
  measureElementInRoot,
  type RectLike,
} from '../utils/anchored-overlay';

export const ANCHOR_MENU_GAP_PX = 6;

const sameRect = (prev: RectLike | null, next: RectLike | null): boolean => {
  if (prev === next) return true;
  if (!prev || !next) return false;
  return (
    prev.top === next.top &&
    prev.left === next.left &&
    prev.bottom === next.bottom &&
    prev.right === next.right &&
    prev.width === next.width &&
    prev.height === next.height
  );
};

/**
 * Root-local trigger box for a menu portaled into the board host.
 * Offset geometry stays in the widget tree. Re-measures on resize and on
 * capture-phase scroll, including the toolbar's horizontal scroller.
 */
export const useAnchoredRootBox = (
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  rootRef: RefObject<HTMLElement | null> | null,
): RectLike | null => {
  const [box, setBox] = useState<RectLike | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setBox(null);
      return;
    }

    const update = () => {
      const anchor = anchorRef.current;
      const root = rootRef?.current ?? null;
      if (!anchor || !root) {
        setBox(null);
        return;
      }
      const next = measureElementInRoot(anchor, root);
      setBox((prev) => (sameRect(prev, next) ? prev : next));
    };

    update();

    const cleanups: Array<() => void> = [];
    const anchor = anchorRef.current;
    const root = rootRef?.current ?? null;
    const view = anchor?.ownerDocument?.defaultView;

    if (view) {
      view.addEventListener('resize', update);
      view.addEventListener('scroll', update, true);
      cleanups.push(() => {
        view.removeEventListener('resize', update);
        view.removeEventListener('scroll', update, true);
      });
    }

    let node: HTMLElement | null = anchor;
    let guard = 0;
    while (node && guard < 40) {
      node.addEventListener('scroll', update, true);
      const current = node;
      cleanups.push(() => current.removeEventListener('scroll', update, true));
      if (root && node === root) break;
      node = node.parentElement;
      guard += 1;
    }

    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  }, [open, anchorRef, rootRef]);

  return box;
};
