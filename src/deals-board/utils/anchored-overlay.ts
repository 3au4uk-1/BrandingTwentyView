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

export type AnchoredOverlayPositionOpts = {
  anchor: RectLike;
  overlayWidth: number;
  overlayHeight: number;
  rootWidth: number;
  rootHeight: number;
  gap?: number;
  margin?: number;
};

/**
 * Place a panel below the anchor (flip above if needed), clamp inside the root box.
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
}: AnchoredOverlayPositionOpts): { top: number; left: number; transform?: string } => {
  let top = anchor.bottom + gap;
  let transform: string | undefined;

  if (top + overlayHeight > rootHeight - margin) {
    top = anchor.top - gap;
    transform = 'translateY(-100%)';
  }

  let left = anchor.left;
  left = Math.min(left, Math.max(margin, rootWidth - overlayWidth - margin));
  left = Math.max(margin, left);

  return { top, left, transform };
};
