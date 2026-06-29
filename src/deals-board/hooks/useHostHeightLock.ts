import { useLayoutEffect, type RefObject } from 'react';

const applyHostHeight = (root: HTMLElement) => {
  const parent = root.parentElement;
  if (!parent) return;

  const height = parent.clientHeight;
  if (height <= 0) return;

  root.style.height = `${height}px`;
  root.style.maxHeight = `${height}px`;
};

export const useHostHeightLock = (rootRef: RefObject<HTMLElement | null>) => {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let frameId = 0;
    let attempts = 0;

    const scheduleApply = () => {
      applyHostHeight(root);
      if (root.parentElement && root.parentElement.clientHeight <= 0 && attempts < 12) {
        attempts += 1;
        frameId = requestAnimationFrame(scheduleApply);
      }
    };

    scheduleApply();

    const parent = root.parentElement;
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(scheduleApply) : undefined;
    if (parent) observer?.observe(parent);
    observer?.observe(root);

    const view = root.ownerDocument?.defaultView;
    if (view && typeof view.addEventListener === 'function') {
      view.addEventListener('resize', scheduleApply);
    }

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      observer?.disconnect();
      if (view && typeof view.removeEventListener === 'function') {
        view.removeEventListener('resize', scheduleApply);
      }
      root.style.height = '';
      root.style.maxHeight = '';
    };
  }, [rootRef]);
};
