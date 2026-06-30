export type DomLikeElement = {
  clientHeight?: number;
  scrollHeight?: number;
  offsetTop?: number;
  parentElement?: DomLikeElement | null;
  ownerDocument?: { defaultView?: { innerHeight?: number } | null } | null;
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

export const readOffsetTop = (element: unknown): number => {
  if (!element || typeof element !== 'object') return 0;
  return readNumber((element as DomLikeElement).offsetTop);
};

export const readParentElement = (element: unknown): DomLikeElement | null => {
  if (!element || typeof element !== 'object') return null;
  const parent = (element as DomLikeElement).parentElement;
  return parent && typeof parent === 'object' ? parent : null;
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

const isScrollContainer = (element: unknown): boolean => {
  const clientHeight = readClientHeight(element);
  const scrollHeight = readScrollHeight(element);
  return clientHeight > 0 && scrollHeight > clientHeight + 2;
};

/**
 * Resolves a bounded height for the deals board root inside Twenty's page layout.
 * Prefers the nearest scroll ancestor (host ScrollWrapper), then a fixed-height parent,
 * then viewport minus cumulative offsetTop.
 */
export const resolveBoundedHostHeight = (root: DomLikeElement): number => {
  const view = root.ownerDocument?.defaultView;
  const viewportHeight = readNumber(view?.innerHeight);

  let scrollContainer: DomLikeElement | null = null;
  let largestBounded = 0;
  let current = readParentElement(root);

  while (current) {
    const clientHeight = readClientHeight(current);

    if (clientHeight > 0) {
      if (isScrollContainer(current)) {
        scrollContainer = current;
        break;
      }

      if (viewportHeight > 0 && clientHeight < viewportHeight * 0.98 && clientHeight > largestBounded) {
        largestBounded = clientHeight;
      }
    }

    current = readParentElement(current);
  }

  let baseHeight = 0;

  if (scrollContainer) {
    baseHeight = readClientHeight(scrollContainer) - getOffsetTopWithin(root, scrollContainer) - 4;
  } else if (largestBounded > 100) {
    baseHeight = largestBounded;
  } else if (viewportHeight > 0) {
    let offsetTop = 0;
    let element: unknown = root;

    while (element) {
      offsetTop += readOffsetTop(element);
      element = readParentElement(element);
    }

    baseHeight = viewportHeight - offsetTop - 12;
  }

  return baseHeight > 100 ? Math.floor(baseHeight) : 0;
};
