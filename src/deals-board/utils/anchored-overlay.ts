export type OverlayElementLike = {
  offsetTop?: number;
  offsetLeft?: number;
  offsetWidth?: number;
  offsetHeight?: number;
  clientWidth?: number;
  clientHeight?: number;
  scrollTop?: number;
  scrollLeft?: number;
  parentElement?: OverlayElementLike | null;
  offsetParent?: OverlayElementLike | null;
};

export type OverlayAnchorRect = {
  top: number;
  left: number;
  bottom: number;
  right: number;
  width: number;
  height: number;
};

const readNumber = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

export const resolveAnchorRectWithinRoot = (
  anchor: OverlayElementLike,
  root: OverlayElementLike,
): OverlayAnchorRect => {
  let top = 0;
  let left = 0;
  let current: OverlayElementLike | null | undefined = anchor;

  while (current && current !== root) {
    top += readNumber(current.offsetTop);
    left += readNumber(current.offsetLeft);
    current = current.offsetParent ?? current.parentElement;
  }

  current = anchor.parentElement;
  while (current && current !== root) {
    top -= readNumber(current.scrollTop);
    left -= readNumber(current.scrollLeft);
    current = current.parentElement;
  }

  const width = readNumber(anchor.offsetWidth);
  const height = readNumber(anchor.offsetHeight);

  return {
    top,
    left,
    bottom: top + height,
    right: left + width,
    width,
    height,
  };
};

type ResolveAnchoredOverlayPositionArgs = {
  anchorRect: OverlayAnchorRect;
  overlayWidth: number;
  overlayHeight: number;
  containerWidth: number;
  containerHeight: number;
  margin?: number;
  gap?: number;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), Math.max(min, max));

export const resolveAnchoredOverlayPosition = ({
  anchorRect,
  overlayWidth,
  overlayHeight,
  containerWidth,
  containerHeight,
  margin = 8,
  gap = 4,
}: ResolveAnchoredOverlayPositionArgs): { top: number; left: number } => {
  const spaceBelow = containerHeight - anchorRect.bottom - margin;
  const canShowAbove = anchorRect.top - margin >= overlayHeight + gap;
  const showAbove = spaceBelow < overlayHeight + gap && canShowAbove;

  const top = showAbove
    ? anchorRect.top - overlayHeight - gap
    : anchorRect.bottom + gap;
  const left = clamp(
    anchorRect.right - overlayWidth,
    margin,
    containerWidth - overlayWidth - margin,
  );

  return {
    top: clamp(top, margin, containerHeight - overlayHeight - margin),
    left,
  };
};
