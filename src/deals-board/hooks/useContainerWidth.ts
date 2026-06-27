import { useLayoutEffect, useState, type RefObject } from 'react';

const measureElementWidth = (element: HTMLElement): number => {
  const width = element.clientWidth;
  if (width > 0) return Math.floor(width);

  const parentWidth = element.parentElement?.clientWidth ?? 0;
  if (parentWidth > 0) return Math.floor(parentWidth);

  const view = element.ownerDocument?.defaultView ?? window;
  return Math.floor(view.innerWidth);
};

export const useContainerWidth = (containerRef: RefObject<HTMLElement | null>) => {
  const [containerWidth, setContainerWidth] = useState(0);

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    let frameId = 0;
    let attempts = 0;

    const updateWidth = () => {
      setContainerWidth(measureElementWidth(element));
    };

    const scheduleMeasure = () => {
      updateWidth();
      if (element.clientWidth <= 0 && attempts < 12) {
        attempts += 1;
        frameId = requestAnimationFrame(scheduleMeasure);
      }
    };

    scheduleMeasure();

    const view = element.ownerDocument?.defaultView ?? window;
    view.addEventListener('resize', updateWidth);

    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => updateWidth());
      observer.observe(element);
    }

    return () => {
      view.removeEventListener('resize', updateWidth);
      observer?.disconnect();
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [containerRef]);

  return containerWidth;
};
