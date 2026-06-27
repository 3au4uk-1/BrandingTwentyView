import { useLayoutEffect, useState, type RefObject } from 'react';

export const useContainerWidth = (containerRef: RefObject<HTMLElement | null>) => {
  const [containerWidth, setContainerWidth] = useState(0);

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateWidth = () => {
      setContainerWidth(Math.floor(element.clientWidth));
    };

    updateWidth();

    const observer = new ResizeObserver(() => updateWidth());
    observer.observe(element);

    return () => observer.disconnect();
  }, [containerRef]);

  return containerWidth;
};
