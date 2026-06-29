const hasDomMethod = (value: unknown, method: string): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && typeof (value as Record<string, unknown>)[method] === 'function';

export const isDomElement = (value: unknown): value is HTMLElement =>
  hasDomMethod(value, 'getBoundingClientRect') || hasDomMethod(value, 'contains');

export const isMeasurableElement = (value: unknown): value is HTMLElement =>
  hasDomMethod(value, 'getBoundingClientRect');

export const DEALS_BOARD_ROOT_ID = 'deals-board-root';
export const DEALS_BOARD_TOOLBAR_ID = 'deals-board-toolbar';

/** Cumulative horizontal scale from CSS transforms on element and its ancestors. */
export const getElementScaleX = (element: HTMLElement | null | undefined): number => {
  if (!element || typeof window === 'undefined' || typeof element.parentElement === 'undefined') {
    return 1;
  }

  let scaleX = 1;
  let current: HTMLElement | null = element;

  while (current) {
    try {
      const { transform } = window.getComputedStyle(current);
      if (transform && transform !== 'none') {
        scaleX *= new DOMMatrixReadOnly(transform).a;
      }
    } catch {
      break;
    }
    current = current.parentElement;
  }

  return scaleX || 1;
};

/** Portal target; falls back to document.body when worker refs lack full DOM APIs. */
export const getPortalContainer = (anchor: unknown): Element => {
  if (typeof document === 'undefined') {
    throw new Error('document is unavailable');
  }

  if (hasDomMethod(anchor, 'getRootNode')) {
    try {
      const root = (anchor as HTMLElement).getRootNode();
      if (root instanceof ShadowRoot) {
        const existing = root.querySelector('[data-deals-board-portal]');
        if (existing) return existing;

        const container = document.createElement('div');
        container.setAttribute('data-deals-board-portal', '');
        container.style.position = 'relative';
        container.style.zIndex = '9999';
        root.appendChild(container);
        return container;
      }
    } catch {
      // Worker refs may expose getRootNode but fail at runtime.
    }
  }

  return document.body;
};
