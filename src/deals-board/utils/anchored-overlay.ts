/** Geometry helpers for overlays inside Twenty Remote DOM (root-relative absolute). */

export type RectLike = {
  top: number;
  left: number;
  bottom: number;
  right: number;
  width: number;
  height: number;
};

export type PointLike = {
  x: number;
  y: number;
};

type Measurable = {
  getBoundingClientRect: () => DOMRect | RectLike;
};

type OffsetNode = {
  offsetLeft?: number;
  offsetTop?: number;
  offsetWidth?: number;
  offsetHeight?: number;
  scrollLeft?: number;
  scrollTop?: number;
  offsetParent?: OffsetNode | null;
  parentElement?: OffsetNode | null;
};

export const readClientRect = (element: Measurable | null | undefined): RectLike | null => {
  if (!element || typeof element.getBoundingClientRect !== 'function') return null;
  try {
    const rect = element.getBoundingClientRect();
    if (!rect || typeof rect.left !== 'number' || typeof rect.top !== 'number') return null;
    const width = typeof rect.width === 'number' ? rect.width : 0;
    const height = typeof rect.height === 'number' ? rect.height : 0;
    return {
      top: rect.top,
      left: rect.left,
      bottom: typeof rect.bottom === 'number' ? rect.bottom : rect.top + height,
      right: typeof rect.right === 'number' ? rect.right : rect.left + width,
      width,
      height,
    };
  } catch {
    return null;
  }
};

/** Convert viewport/client point into coordinates relative to the portal root. */
export const clientPointToRootOffset = (
  point: PointLike,
  root: Measurable | null | undefined,
): PointLike => {
  const rootRect = readClientRect(root);
  if (!rootRect) return { x: point.x, y: point.y };
  return {
    x: point.x - rootRect.left,
    y: point.y - rootRect.top,
  };
};

/** Convert a client rect into a rect relative to the portal root. */
export const clientRectToRootOffset = (
  rect: RectLike,
  root: Measurable | null | undefined,
): RectLike => {
  const rootRect = readClientRect(root);
  if (!rootRect) return { ...rect };
  return {
    top: rect.top - rootRect.top,
    left: rect.left - rootRect.left,
    bottom: rect.bottom - rootRect.top,
    right: rect.right - rootRect.left,
    width: rect.width,
    height: rect.height,
  };
};

/**
 * Sum offsetLeft/offsetTop via offsetParent until ancestor.
 * Prefer this over getBoundingClientRect in Twenty Remote DOM — client rects mix
 * host-page and widget spaces, while offset* stays inside the widget tree.
 */
export const offsetRelativeToAncestor = (
  element: OffsetNode | null | undefined,
  ancestor: OffsetNode | null | undefined,
): PointLike | null => {
  if (!element || !ancestor || element === ancestor) {
    return element && ancestor && element === ancestor ? { x: 0, y: 0 } : null;
  }

  let x = 0;
  let y = 0;
  let current: OffsetNode | null = element;
  let guard = 0;

  while (current && current !== ancestor && guard < 80) {
    x += Number(current.offsetLeft) || 0;
    y += Number(current.offsetTop) || 0;

    const parent: OffsetNode | null = current.offsetParent ?? null;
    if (!parent) {
      // offsetParent chain broken — finish via parentElement offsets (best effort)
      let node: OffsetNode | null = current.parentElement ?? null;
      while (node && node !== ancestor && guard < 80) {
        x += Number(node.offsetLeft) || 0;
        y += Number(node.offsetTop) || 0;
        x -= Number(node.scrollLeft) || 0;
        y -= Number(node.scrollTop) || 0;
        node = node.parentElement ?? null;
        guard += 1;
      }
      return node === ancestor ? { x, y } : null;
    }

    // Scrollable ancestors between current and its offsetParent.
    let walker: OffsetNode | null = current.parentElement ?? null;
    while (walker && walker !== parent && walker !== ancestor) {
      x -= Number(walker.scrollLeft) || 0;
      y -= Number(walker.scrollTop) || 0;
      walker = walker.parentElement ?? null;
      guard += 1;
    }

    x -= Number(parent.scrollLeft) || 0;
    y -= Number(parent.scrollTop) || 0;
    current = parent;
    guard += 1;
  }

  return current === ancestor ? { x, y } : null;
};

/** Root-local box of an element using offset geometry (Remote DOM–safe). */
export const measureElementInRoot = (
  element: OffsetNode | null | undefined,
  root: OffsetNode | null | undefined,
): RectLike | null => {
  const offset = offsetRelativeToAncestor(element, root);
  if (!offset || !element) return null;
  const width = Number(element.offsetWidth) || 0;
  const height = Number(element.offsetHeight) || 0;
  return {
    left: offset.x,
    top: offset.y,
    width,
    height,
    right: offset.x + width,
    bottom: offset.y + height,
  };
};

export type AnchoredOverlayPositionOpts = {
  anchor: RectLike;
  overlayWidth: number;
  overlayHeight: number;
  rootWidth: number;
  rootHeight: number;
  gap?: number;
  margin?: number;
  /** Prefer placing above the anchor (files popover). */
  preferAbove?: boolean;
};

/**
 * Place a panel relative to the anchor, clamp inside the root box.
 * Anchor and root sizes must already be in the same coordinate space (root-relative).
 */
export const resolveAnchoredOverlayPosition = ({
  anchor,
  overlayWidth,
  overlayHeight,
  rootWidth,
  rootHeight,
  gap = 4,
  margin = 8,
  preferAbove = false,
}: AnchoredOverlayPositionOpts): { top: number; left: number; transform?: string } => {
  let top: number;
  let transform: string | undefined;

  if (preferAbove) {
    top = anchor.top - gap;
    transform = 'translateY(-100%)';
    if (top - overlayHeight < margin) {
      top = anchor.bottom + gap;
      transform = undefined;
    }
  } else {
    top = anchor.bottom + gap;
    transform = undefined;
    if (top + overlayHeight > rootHeight - margin) {
      top = anchor.top - gap;
      transform = 'translateY(-100%)';
    }
  }

  let left = anchor.left;
  left = Math.min(left, Math.max(margin, rootWidth - overlayWidth - margin));
  left = Math.max(margin, left);

  return { top, left, transform };
};

/** Hover preview to the right of the thumb. */
export const resolveHoverPreviewPosition = (
  anchor: RectLike,
  previewMax: number,
  rootWidth: number,
  rootHeight: number,
  gap = 8,
  margin = 8,
): { top: number; left: number } => {
  let left = anchor.right + gap;
  let top = anchor.top;

  if (left + previewMax > rootWidth - margin) {
    left = Math.max(margin, anchor.left - gap - previewMax);
  }
  if (top + previewMax > rootHeight - margin) {
    top = Math.max(margin, rootHeight - previewMax - margin);
  }
  top = Math.max(margin, top);
  left = Math.max(margin, left);

  return { top, left };
};
