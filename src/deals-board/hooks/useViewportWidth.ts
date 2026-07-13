import { useLayoutEffect, useState, type RefObject } from 'react';

import {
  collectViewportWidthCandidates,
  readMobileMediaQueryMatches,
  resolveViewportWidth,
} from '../utils/viewport-width';

export const useViewportWidth = (containerRef: RefObject<HTMLElement | null>) => {
  const [viewportWidth, setViewportWidth] = useState(0);

  useLayoutEffect(() => {
    const element = containerRef.current;

    const updateWidth = () => {
      setViewportWidth(resolveViewportWidth(collectViewportWidthCandidates(element)));
    };

    updateWidth();

    const views = new Set<Window>();
    const ownerView = element?.ownerDocument?.defaultView;
    if (ownerView) views.add(ownerView);
    if (typeof window !== 'undefined') views.add(window);

    for (const view of views) {
      view.addEventListener('resize', updateWidth);
      view.visualViewport?.addEventListener('resize', updateWidth);
    }

    let mediaQuery: MediaQueryList | undefined;
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      mediaQuery = window.matchMedia('(max-width: 767px)');
      mediaQuery.addEventListener('change', updateWidth);
    }

    return () => {
      for (const view of views) {
        view.removeEventListener('resize', updateWidth);
        view.visualViewport?.removeEventListener('resize', updateWidth);
      }
      mediaQuery?.removeEventListener('change', updateWidth);
    };
  }, [containerRef]);

  return viewportWidth;
};

export const usePrefersMobileViewport = () => {
  const [prefersMobile, setPrefersMobile] = useState(readMobileMediaQueryMatches);

  useLayoutEffect(() => {
    const update = () => setPrefersMobile(readMobileMediaQueryMatches());
    update();

    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQueries = [
      window.matchMedia('(max-width: 767px)'),
      window.matchMedia('(pointer: coarse) and (max-width: 1024px)'),
    ];

    for (const mediaQuery of mediaQueries) {
      mediaQuery.addEventListener('change', update);
    }

    return () => {
      for (const mediaQuery of mediaQueries) {
        mediaQuery.removeEventListener('change', update);
      }
    };
  }, []);

  return prefersMobile;
};
