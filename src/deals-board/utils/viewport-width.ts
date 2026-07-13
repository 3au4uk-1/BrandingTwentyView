import { MOBILE_BREAKPOINT } from './layout-mode';

export const MOBILE_MEDIA_QUERY = `(max-width: 767px)`;
export const MOBILE_COARSE_POINTER_MEDIA_QUERY = `(pointer: coarse) and (max-width: 1024px)`;

const readViewportWidth = (view: Window | null | undefined): number => {
  if (!view) return 0;

  const visualWidth = view.visualViewport?.width;
  if (typeof visualWidth === 'number' && visualWidth > 0) {
    return Math.floor(visualWidth);
  }

  if (typeof view.innerWidth === 'number' && view.innerWidth > 0) {
    return Math.floor(view.innerWidth);
  }

  return 0;
};

export const collectViewportWidthCandidates = (element?: HTMLElement | null): number[] => {
  const candidates: number[] = [];

  const ownerView = element?.ownerDocument?.defaultView ?? null;
  candidates.push(readViewportWidth(ownerView));

  if (typeof window !== 'undefined') {
    candidates.push(readViewportWidth(window));

    try {
      if (window.parent && window.parent !== window) {
        candidates.push(readViewportWidth(window.parent));
      }
    } catch {
      // Cross-origin parent — ignore.
    }
  }

  return candidates.filter((value) => value > 0);
};

export const resolveViewportWidth = (candidates: number[]): number => {
  if (candidates.length === 0) return 0;
  return Math.min(...candidates);
};

export const resolveLayoutEffectiveWidth = (
  containerWidth: number,
  viewportWidth: number,
): number => {
  if (containerWidth > 0 && viewportWidth > 0) {
    return Math.min(containerWidth, viewportWidth);
  }
  if (viewportWidth > 0) return viewportWidth;
  return containerWidth;
};

const readMediaQueryMatches = (
  view: Window | null | undefined,
  query: string,
): boolean => {
  if (!view?.matchMedia) return false;
  return view.matchMedia(query).matches;
};

export const readMobileMediaQueryMatches = (): boolean => {
  if (typeof window === 'undefined') return false;

  if (readMediaQueryMatches(window, MOBILE_MEDIA_QUERY)) return true;
  if (readMediaQueryMatches(window, MOBILE_COARSE_POINTER_MEDIA_QUERY)) return true;

  try {
    if (window.parent && window.parent !== window) {
      if (readMediaQueryMatches(window.parent, MOBILE_MEDIA_QUERY)) return true;
      if (readMediaQueryMatches(window.parent, MOBILE_COARSE_POINTER_MEDIA_QUERY)) return true;
    }
  } catch {
    // Cross-origin parent — ignore.
  }

  return false;
};

export const detectMobileUserAgent = (): boolean => {
  if (typeof navigator === 'undefined') return false;

  const userAgent = navigator.userAgent || '';
  if (/Android|iPhone|iPod|Mobile|IEMobile|Opera Mini/i.test(userAgent)) {
    return true;
  }

  // iPadOS 13+ may report as Macintosh.
  if (/iPad|Macintosh/i.test(userAgent) && navigator.maxTouchPoints > 1) {
    return true;
  }

  return false;
};

export const detectNarrowScreen = (): boolean => {
  if (typeof screen === 'undefined') return false;
  const shortestSide = Math.min(screen.width || 0, screen.height || 0);
  return shortestSide > 0 && shortestSide < MOBILE_BREAKPOINT;
};

export const detectCoarsePointer = (): boolean => {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(pointer: coarse)').matches;
};

export type MobileLayoutSignals = {
  prefersMobileMedia: boolean;
  viewportWidth: number;
  containerWidth: number;
  mobileUserAgent: boolean;
  narrowScreen: boolean;
  coarsePointer: boolean;
};

export const resolveShouldUseMobileLayout = (signals: MobileLayoutSignals): boolean => {
  if (signals.prefersMobileMedia) return true;
  if (signals.mobileUserAgent) return true;
  if (signals.narrowScreen && signals.coarsePointer) return true;

  const effectiveWidth = resolveLayoutEffectiveWidth(
    signals.containerWidth,
    signals.viewportWidth,
  );
  if (effectiveWidth > 0 && effectiveWidth < MOBILE_BREAKPOINT) {
    return true;
  }

  return false;
};
