export const MOBILE_MEDIA_QUERY = `(max-width: 767px)`;

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

export const readMobileMediaQueryMatches = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
};
