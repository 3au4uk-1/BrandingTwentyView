import { useLayoutEffect, useState, type RefObject } from 'react';

import {
  collectViewportWidthCandidates,
  detectCoarsePointer,
  detectMobileUserAgent,
  detectNarrowScreen,
  readMobileMediaQueryMatches,
  resolveShouldUseMobileLayout,
  resolveViewportWidth,
  type MobileLayoutSignals,
} from '../utils/viewport-width';
import { useContainerWidth } from './useContainerWidth';

const collectMobileLayoutSignals = (
  element: HTMLElement | null,
  containerWidth: number,
): MobileLayoutSignals => ({
  prefersMobileMedia: readMobileMediaQueryMatches(),
  viewportWidth: resolveViewportWidth(collectViewportWidthCandidates(element)),
  containerWidth,
  mobileUserAgent: detectMobileUserAgent(),
  narrowScreen: detectNarrowScreen(),
  coarsePointer: detectCoarsePointer(),
});

export const useShouldUseMobileLayout = (containerRef: RefObject<HTMLElement | null>) => {
  const containerWidth = useContainerWidth(containerRef);
  const [signals, setSignals] = useState<MobileLayoutSignals>(() =>
    collectMobileLayoutSignals(null, 0),
  );

  useLayoutEffect(() => {
    const element = containerRef.current;

    const updateSignals = () => {
      setSignals(collectMobileLayoutSignals(element, containerWidth));
    };

    updateSignals();

    const views = new Set<Window>();
    const ownerView = element?.ownerDocument?.defaultView;
    if (ownerView) views.add(ownerView);
    if (typeof window !== 'undefined') views.add(window);

    for (const view of views) {
      view.addEventListener('resize', updateSignals);
      view.visualViewport?.addEventListener('resize', updateSignals);
    }

    const mediaQueries: MediaQueryList[] = [];
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      for (const query of ['(max-width: 767px)', '(pointer: coarse) and (max-width: 1024px)']) {
        const mediaQuery = window.matchMedia(query);
        mediaQueries.push(mediaQuery);
        mediaQuery.addEventListener('change', updateSignals);
      }
    }

    return () => {
      for (const view of views) {
        view.removeEventListener('resize', updateSignals);
        view.visualViewport?.removeEventListener('resize', updateSignals);
      }
      for (const mediaQuery of mediaQueries) {
        mediaQuery.removeEventListener('change', updateSignals);
      }
    };
  }, [containerRef, containerWidth]);

  return resolveShouldUseMobileLayout(signals);
};
