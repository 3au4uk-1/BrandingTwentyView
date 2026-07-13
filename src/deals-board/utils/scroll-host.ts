export const PAGE_LAYOUT_SCROLL_WRAPPER_SELECTOR = '[id*="scroll-wrapper-page-layout"]';

export const findPageLayoutScrollWrapperElement = (): HTMLElement | null => {
  if (typeof document === 'undefined') return null;

  const match = document.querySelector(PAGE_LAYOUT_SCROLL_WRAPPER_SELECTOR);
  return match instanceof HTMLElement ? match : null;
};

export const readElementRect = (element: Element | null | undefined) => {
  if (!element || typeof (element as HTMLElement).getBoundingClientRect !== 'function') {
    return null;
  }

  try {
    return (element as HTMLElement).getBoundingClientRect();
  } catch {
    return null;
  }
};

export type FixedPinMetrics = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export const measureDesktopToolbarPin = (
  root: HTMLElement,
  toolbar: HTMLElement,
  scrollHostOverride?: HTMLElement | null,
): FixedPinMetrics | null => {
  const rootRect = readElementRect(root);
  const toolbarRect = readElementRect(toolbar);
  if (!rootRect || !toolbarRect) return null;

  const scrollHost = scrollHostOverride ?? findPageLayoutScrollWrapperElement();
  const scrollRect = readElementRect(scrollHost);
  const anchorTop = scrollRect ? scrollRect.top : rootRect.top;

  return {
    top: Math.round(anchorTop),
    left: Math.round(rootRect.left),
    width: Math.max(0, Math.round(rootRect.width)),
    height: Math.max(0, Math.round(toolbarRect.height)),
  };
};
