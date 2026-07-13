import { useLayoutEffect, useState, type RefObject } from 'react';

import {
  readClientHeight,
  readParentElement,
  resolveBoundedHostHeight,
  type DomLikeElement,
} from '../utils/host-height';
import { readElementRect } from '../utils/scroll-host';

const collectAncestors = (root: HTMLElement): HTMLElement[] => {
  const ancestors: HTMLElement[] = [];
  let current = readParentElement(root);

  while (current) {
    ancestors.push(current as HTMLElement);
    current = readParentElement(current);
  }

  return ancestors;
};

export const useHostHeightLock = (
  rootRef: RefObject<HTMLElement | null>,
  enabled = true,
): number | undefined => {
  const [lockedHeight, setLockedHeight] = useState<number | undefined>();

  useLayoutEffect(() => {
    if (!enabled) {
      setLockedHeight(undefined);
      return;
    }

    const root = rootRef.current;
    if (!root) return;

    let frameId = 0;
    let attempts = 0;
    const ownerView = root.ownerDocument?.defaultView;
    const globalView = typeof window !== 'undefined' ? window : undefined;
    const view =
      ownerView && typeof ownerView.addEventListener === 'function'
        ? ownerView
        : globalView;

    const scheduleApply = () => {
      const viewportHeight =
        typeof view?.innerHeight === 'number' ? view.innerHeight : 0;
      let height = resolveBoundedHostHeight(root as DomLikeElement, viewportHeight);

      if (height <= 0 && viewportHeight > 0) {
        const rootRect = readElementRect(root);
        height = rootRect
          ? Math.floor(viewportHeight - rootRect.top - 16)
          : Math.floor(viewportHeight - 120);
      }

      if (height > 100) {
        setLockedHeight((current) => (current === height ? current : height));
      }

      if (height <= 100 && attempts < 60) {
        attempts += 1;
        frameId = requestAnimationFrame(scheduleApply);
      }
    };

    scheduleApply();

    const ancestors = collectAncestors(root);
    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(scheduleApply) : undefined;

    observer?.observe(root);
    for (const ancestor of ancestors) {
      if (readClientHeight(ancestor) > 0) {
        observer?.observe(ancestor);
      }
    }

    if (view && typeof view.addEventListener === 'function') {
      view.addEventListener('resize', scheduleApply);
      view.visualViewport?.addEventListener('resize', scheduleApply);
    }

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      observer?.disconnect();
      if (view && typeof view.removeEventListener === 'function') {
        view.removeEventListener('resize', scheduleApply);
        view.visualViewport?.removeEventListener('resize', scheduleApply);
      }
      setLockedHeight(undefined);
    };
  }, [enabled, rootRef]);

  return lockedHeight;
};
