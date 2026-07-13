export type DomLikeElement = {
  id?: string;
  clientHeight?: number;
  scrollHeight?: number;
  scrollTop?: number;
  offsetTop?: number;
  parentElement?: DomLikeElement | null;
  ownerDocument?: {
    defaultView?: { innerHeight?: number } | null;
    querySelector?: (selector: string) => DomLikeElement | null;
  } | null;
  closest?: (selector: string) => DomLikeElement | null;
  getBoundingClientRect?: () => {
    top?: number;
    bottom?: number;
    height?: number;
  };
};

const readNumber = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

export const readClientHeight = (element: unknown): number => {
  if (!element || typeof element !== 'object') return 0;
  return readNumber((element as DomLikeElement).clientHeight);
};

export const readScrollHeight = (element: unknown): number => {
  if (!element || typeof element !== 'object') return 0;
  return readNumber((element as DomLikeElement).scrollHeight);
};

export const readScrollTop = (element: unknown): number => {
  if (!element || typeof element !== 'object') return 0;
  return readNumber((element as DomLikeElement).scrollTop);
};

export const readOffsetTop = (element: unknown): number => {
  if (!element || typeof element !== 'object') return 0;
  return readNumber((element as DomLikeElement).offsetTop);
};

export const readElementId = (element: unknown): string => {
  if (!element || typeof element !== 'object') return '';
  const id = (element as DomLikeElement).id;
  return typeof id === 'string' ? id : '';
};

export const readParentElement = (element: unknown): DomLikeElement | null => {
  if (!element || typeof element !== 'object') return null;
  const parent = (element as DomLikeElement).parentElement;
  return parent && typeof parent === 'object' ? parent : null;
};

export const isPageLayoutScrollWrapper = (element: unknown): boolean => {
  const id = readElementId(element);
  return id.includes('scroll-wrapper-page-layout');
};

const getOffsetTopWithin = (root: unknown, ancestor: unknown): number => {
  let offset = 0;
  let current: unknown = root;

  while (current && current !== ancestor) {
    offset += readOffsetTop(current);
    current = readParentElement(current);
  }

  return current === ancestor ? offset : 0;
};

const readBoundingRect = (element: unknown) => {
  if (!element || typeof element !== 'object') return null;
  const getRect = (element as DomLikeElement).getBoundingClientRect;
  if (typeof getRect !== 'function') return null;
  try {
    return getRect.call(element) ?? null;
  } catch {
    return null;
  }
};

export const getRootOffsetWithinAncestor = (root: unknown, ancestor: unknown): number => {
  const rootRect = readBoundingRect(root);
  const ancestorRect = readBoundingRect(ancestor);

  if (rootRect && ancestorRect) {
    return readNumber(rootRect.top) - readNumber(ancestorRect.top) + readScrollTop(ancestor);
  }

  return getOffsetTopWithin(root, ancestor);
};

const isScrollContainer = (element: unknown): boolean => {
  const clientHeight = readClientHeight(element);
  const scrollHeight = readScrollHeight(element);
  return clientHeight > 0 && scrollHeight > clientHeight + 2;
};

const findPageLayoutScrollWrapper = (root: DomLikeElement): DomLikeElement | null => {
  let current = readParentElement(root);

  while (current) {
    if (isPageLayoutScrollWrapper(current)) {
      return current;
    }
    current = readParentElement(current);
  }

  const closest = root.closest?.('[id*="scroll-wrapper-page-layout"]') ?? null;
  if (closest && isPageLayoutScrollWrapper(closest)) {
    return closest;
  }

  const fromDocument = root.ownerDocument?.querySelector?.('[id*="scroll-wrapper-page-layout"]') ?? null;
  if (fromDocument && isPageLayoutScrollWrapper(fromDocument)) {
    return fromDocument;
  }

  return null;
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

/**
 * Resolves a bounded height for the deals board root inside Twenty's page layout.
 * Prefers Twenty's page-layout scroll wrapper, then any scroll ancestor,
 * then viewport minus root top offset.
 */
export const resolveBoundedHostHeight = (
  root: DomLikeElement,
  fallbackViewportHeight = 0,
): number => {
  const view = root.ownerDocument?.defaultView;
  const viewportHeight =
    readNumber(view?.innerHeight) || readNumber(fallbackViewportHeight);

  const pageLayoutScrollWrapper = findPageLayoutScrollWrapper(root);
  let scrollContainer: DomLikeElement | null = pageLayoutScrollWrapper;
  let largestBounded = 0;
  let current = readParentElement(root);

  if (!scrollContainer) {
    while (current) {
      const clientHeight = readClientHeight(current);

      if (clientHeight > 0) {
        if (isScrollContainer(current)) {
          scrollContainer = current;
          break;
        }

        if (
          viewportHeight > 0 &&
          clientHeight < viewportHeight * 0.98 &&
          clientHeight > largestBounded
        ) {
          largestBounded = clientHeight;
        }
      }

      current = readParentElement(current);
    }
  }

  let baseHeight = 0;

  if (scrollContainer) {
    const offsetWithin = getRootOffsetWithinAncestor(root, scrollContainer);
    baseHeight = readClientHeight(scrollContainer) - offsetWithin - 4;
  } else if (largestBounded > 100) {
    baseHeight = largestBounded;
  } else if (viewportHeight > 0) {
    const rootRect = readBoundingRect(root);
    if (rootRect) {
      baseHeight = viewportHeight - readNumber(rootRect.top) - 12;
    } else {
      let offsetTop = 0;
      let element: unknown = root;

      while (element) {
        offsetTop += readOffsetTop(element);
        element = readParentElement(element);
      }

      baseHeight = viewportHeight - offsetTop - 12;
    }
  }

  return baseHeight > 100 ? Math.floor(baseHeight) : 0;
};
