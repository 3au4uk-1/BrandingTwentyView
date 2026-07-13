import { useLayoutEffect, useState, type RefObject } from 'react';

import {
  findPageLayoutScrollWrapperElement,
  measureDesktopToolbarPin,
  type FixedPinMetrics,
} from '../utils/scroll-host';

const metricsEqual = (left: FixedPinMetrics | undefined, right: FixedPinMetrics) =>
  left?.top === right.top &&
  left?.left === right.left &&
  left?.width === right.width &&
  left?.height === right.height;

export const useDesktopToolbarPin = (
  rootRef: RefObject<HTMLElement | null>,
  toolbarRef: RefObject<HTMLElement | null>,
  enabled: boolean,
): FixedPinMetrics | undefined => {
  const [metrics, setMetrics] = useState<FixedPinMetrics | undefined>();

  useLayoutEffect(() => {
    if (!enabled) {
      setMetrics(undefined);
      return;
    }

    let frameId = 0;
    let attempts = 0;

    const update = () => {
      const root = rootRef.current;
      const toolbar = toolbarRef.current;
      if (!root || !toolbar) return;

      const next = measureDesktopToolbarPin(root, toolbar);
      if (!next) return;

      setMetrics((current) => (metricsEqual(current, next) ? current : next));
    };

    const schedule = () => {
      update();
      if (attempts < 60) {
        attempts += 1;
        frameId = requestAnimationFrame(schedule);
      }
    };

    schedule();

    const scrollHost = findPageLayoutScrollWrapperElement();
    const views = new Set<Window>();
    if (typeof window !== 'undefined') views.add(window);

    const ownerView = rootRef.current?.ownerDocument?.defaultView;
    if (ownerView) views.add(ownerView);

    scrollHost?.addEventListener('scroll', update, { passive: true });

    for (const view of views) {
      view.addEventListener('resize', update);
      view.visualViewport?.addEventListener('resize', update);
      view.visualViewport?.addEventListener('scroll', update);
    }

    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : undefined;

    if (rootRef.current) observer?.observe(rootRef.current);
    if (toolbarRef.current) observer?.observe(toolbarRef.current);
    if (scrollHost) observer?.observe(scrollHost);

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      scrollHost?.removeEventListener('scroll', update);
      for (const view of views) {
        view.removeEventListener('resize', update);
        view.visualViewport?.removeEventListener('resize', update);
        view.visualViewport?.removeEventListener('scroll', update);
      }
      observer?.disconnect();
      setMetrics(undefined);
    };
  }, [enabled, rootRef, toolbarRef]);

  return metrics;
};
