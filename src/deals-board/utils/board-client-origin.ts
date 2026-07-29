import {
  measureElementInRoot,
  readClientRect,
  type Measurable,
  type PointLike,
  type RectLike,
} from './anchored-overlay';

/** Cached host chrome origin (left nav + top bar) in the same space as clientX/Y. */
let cachedOrigin: PointLike | null = null;

export const resetBoardClientOriginCache = (): void => {
  cachedOrigin = null;
};

const isUsefulOrigin = (point: PointLike | null | undefined): point is PointLike =>
  Boolean(point) && (Math.abs(point!.x) > 1 || Math.abs(point!.y) > 1);

const readFrameElementOrigin = (): PointLike | null => {
  try {
    const view = typeof globalThis !== 'undefined' ? globalThis : undefined;
    const frame = (view as { frameElement?: Element | null } | undefined)?.frameElement;
    if (!frame || typeof (frame as Measurable).getBoundingClientRect !== 'function') {
      return null;
    }
    const rect = readClientRect(frame as Measurable);
    if (!rect) return null;
    return { x: rect.left, y: rect.top };
  } catch {
    return null;
  }
};

/**
 * Walk ancestors of the board root looking for the first box that sits inset
 * from the viewport (typical Twenty shell: left nav + top bar).
 */
const readAncestorInsetOrigin = (root: Measurable | null | undefined): PointLike | null => {
  if (!root || typeof (root as { parentElement?: unknown }).parentElement === 'undefined') {
    return null;
  }

  let current: { getBoundingClientRect?: () => DOMRect | RectLike; parentElement?: unknown } | null =
    root as { getBoundingClientRect?: () => DOMRect | RectLike; parentElement?: unknown };
  let guard = 0;

  while (current && guard < 24) {
    const rect = readClientRect(current as Measurable);
    if (rect && isUsefulOrigin({ x: rect.left, y: rect.top })) {
      return { x: rect.left, y: rect.top };
    }
    current = (current.parentElement as typeof current) ?? null;
    guard += 1;
  }

  return null;
};

/**
 * Heuristic from the host document: left nav width + top bar height.
 * Used when Remote DOM reports the widget root at (0,0) while pointer events
 * still use page coordinates.
 */
export const measureHostChromeOrigin = (
  doc: {
    querySelector?: (selectors: string) => Element | null;
  } | null = typeof document !== 'undefined' ? document : null,
): PointLike | null => {
  if (!doc?.querySelector) return null;

  const navSelectors = [
    '[data-testid="navigation-drawer"]',
    '[data-testid="nav-menu"]',
    'nav',
    'aside',
  ];

  let left = 0;
  for (const selector of navSelectors) {
    try {
      const el = doc.querySelector(selector);
      const rect = readClientRect(el as Measurable | null);
      if (rect && rect.width > 40 && rect.left <= 8 && rect.height > 120) {
        left = Math.max(left, rect.right);
        break;
      }
    } catch {
      // ignore selector failures in worker-ish hosts
    }
  }

  let top = 0;
  const topSelectors = [
    '[data-testid="top-bar-container"]',
    '[data-testid="top-bar"]',
    'header',
  ];
  for (const selector of topSelectors) {
    try {
      const el = doc.querySelector(selector);
      const rect = readClientRect(el as Measurable | null);
      if (rect && rect.height > 24 && rect.height < 120 && rect.top <= 8) {
        top = Math.max(top, rect.bottom);
        break;
      }
    } catch {
      // ignore
    }
  }

  if (left <= 1 && top <= 1) return null;
  return { x: left, y: top };
};

/**
 * Where the board content origin sits in client/page coordinates.
 * Prefer live geometry; fall back to iframe / ancestor / host chrome heuristics.
 */
export const resolveBoardClientOrigin = (
  root: Measurable | null | undefined,
): PointLike => {
  const rootRect = readClientRect(root);
  if (rootRect && isUsefulOrigin({ x: rootRect.left, y: rootRect.top })) {
    cachedOrigin = { x: rootRect.left, y: rootRect.top };
    return cachedOrigin;
  }

  const frameOrigin = readFrameElementOrigin();
  if (isUsefulOrigin(frameOrigin)) {
    cachedOrigin = frameOrigin;
    return cachedOrigin;
  }

  const ancestorOrigin = readAncestorInsetOrigin(root);
  if (isUsefulOrigin(ancestorOrigin)) {
    cachedOrigin = ancestorOrigin;
    return cachedOrigin;
  }

  const chromeOrigin = measureHostChromeOrigin();
  if (isUsefulOrigin(chromeOrigin)) {
    cachedOrigin = chromeOrigin;
    return cachedOrigin;
  }

  if (cachedOrigin) return cachedOrigin;
  return { x: 0, y: 0 };
};

/**
 * Calibrate origin from a pointer hit on a known target.
 * client = origin + targetRootLocal + offsetInTarget
 * → origin = client - targetRootLocal - offsetInTarget
 *
 * Requires a real targetInRoot (offset walk). Calibrating with (0,0) would treat the
 * hit element as the board origin and pin overlays to the top-left again.
 */
export const calibrateBoardClientOrigin = (opts: {
  clientX: number;
  clientY: number;
  offsetX: number;
  offsetY: number;
  /** Target position inside the board root (from offset walk). */
  targetInRoot: PointLike;
}): PointLike => {
  const next = {
    x: opts.clientX - opts.targetInRoot.x - opts.offsetX,
    y: opts.clientY - opts.targetInRoot.y - opts.offsetY,
  };
  if (isUsefulOrigin(next)) {
    cachedOrigin = next;
  }
  return cachedOrigin ?? next;
};

/** Map a client/page point into board-root local coordinates. */
export const clientPointToBoardLocal = (
  point: PointLike,
  root: Measurable | null | undefined,
): PointLike => {
  const origin = resolveBoardClientOrigin(root);
  return {
    x: point.x - origin.x,
    y: point.y - origin.y,
  };
};

/** Map a client/page rect into a board-root local box. */
export const clientRectToBoardLocal = (
  rect: RectLike,
  root: Measurable | null | undefined,
): RectLike => {
  const origin = resolveBoardClientOrigin(root);
  return {
    left: rect.left - origin.x,
    top: rect.top - origin.y,
    right: rect.right - origin.x,
    bottom: rect.bottom - origin.y,
    width: rect.width,
    height: rect.height,
  };
};

/**
 * Anchor box for overlays: client rect minus board chrome origin.
 * Falls back to offset-walk measure when client rects are unavailable.
 */
export const measureAnchorInBoard = (
  element: Measurable | null | undefined,
  root: Measurable | null | undefined,
): RectLike | null => {
  if (!element) return null;

  const clientRect = readClientRect(element);
  if (clientRect && (clientRect.width > 0 || clientRect.height > 0)) {
    return clientRectToBoardLocal(clientRect, root);
  }

  return measureElementInRoot(element as never, root as never);
};
