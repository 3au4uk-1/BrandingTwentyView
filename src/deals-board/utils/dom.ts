/** Cumulative horizontal scale from CSS transforms on element and its ancestors. */
export const getElementScaleX = (element: HTMLElement | null | undefined): number => {
  if (!element || typeof window === 'undefined') return 1;

  let scaleX = 1;
  let current: HTMLElement | null = element;

  while (current) {
    const { transform } = window.getComputedStyle(current);
    if (transform && transform !== 'none') {
      scaleX *= new DOMMatrixReadOnly(transform).a;
    }
    current = current.parentElement;
  }

  return scaleX || 1;
};

/** Portal target that stays inside shadow roots used by embedded front components. */
export const getPortalContainer = (anchor: HTMLElement | null | undefined): Element => {
  if (!anchor || typeof document === 'undefined') return document.body;

  const root = anchor.getRootNode();
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

  return document.body;
};
