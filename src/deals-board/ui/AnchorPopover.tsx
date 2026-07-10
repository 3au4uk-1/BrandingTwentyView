import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';

import type { ThemeTokens } from '../theme/tokens';
import {
  resolveAnchoredOverlayPosition,
  resolveAnchorRectWithinRoot,
  type OverlayElementLike,
} from '../utils/anchored-overlay';
import { resolvePortalContainer, usePortalHost } from './PortalHostContext';

export type AnchorPoint = {
  x: number;
  y: number;
};

type AnchorPopoverProps = {
  theme: ThemeTokens;
  isOpen: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  anchorPoint?: AnchorPoint | null;
  children: ReactNode;
  width?: number;
};

type PopoverCoords = {
  top: number;
  left: number;
};

const nodeContains = (node: Node | null | undefined, target: Node) => {
  if (!node) return false;
  if (typeof node.contains === 'function') return node.contains(target);
  return false;
};

export const AnchorPopover = ({
  theme,
  isOpen,
  onClose,
  anchorRef,
  anchorPoint = null,
  children,
  width = 300,
}: AnchorPopoverProps) => {
  const { colors, radius, spacing, zIndex } = theme;
  const portalHostRef = usePortalHost();
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const openedAtRef = useRef(0);
  const [coords, setCoords] = useState<PopoverCoords>({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!isOpen) return;
    openedAtRef.current = Date.now();
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen || !anchorRef.current || !portalHostRef?.current) return;

    const updatePosition = () => {
      const anchor = anchorRef.current;
      const popover = popoverRef.current;
      const root = portalHostRef.current;
      if (!anchor || !root) return;

      const rootLike = root as unknown as OverlayElementLike;
      const anchorRect = anchorPoint
        ? {
            top: anchorPoint.y,
            left: anchorPoint.x,
            bottom: anchorPoint.y,
            right: anchorPoint.x,
            width: 0,
            height: 0,
          }
        : resolveAnchorRectWithinRoot(
            anchor as unknown as OverlayElementLike,
            rootLike,
          );
      const view = typeof window !== 'undefined' ? window : undefined;
      const rootWidth =
        typeof rootLike.clientWidth === 'number' && rootLike.clientWidth > 0
          ? rootLike.clientWidth
          : view?.innerWidth ?? 1280;
      const rootHeight =
        typeof rootLike.clientHeight === 'number' && rootLike.clientHeight > 0
          ? rootLike.clientHeight
          : view?.innerHeight ?? 720;

      setCoords(
        resolveAnchoredOverlayPosition({
          anchorRect,
          overlayWidth: width,
          overlayHeight: popover?.offsetHeight ?? 220,
          containerWidth: rootWidth,
          containerHeight: rootHeight,
        }),
      );
    };

    updatePosition();
    const view = typeof window !== 'undefined' ? window : undefined;
    view?.addEventListener('resize', updatePosition);
    return () => view?.removeEventListener('resize', updatePosition);
  }, [anchorPoint, anchorRef, isOpen, portalHostRef, width, children]);

  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (nodeContains(anchorRef.current, target)) return;
      if (nodeContains(popoverRef.current, target)) return;
      onClose();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    const handleScroll = () => {
      if (Date.now() - openedAtRef.current < 200) return;
      onClose();
    };

    const doc = typeof document !== 'undefined' ? document : undefined;
    const view = typeof window !== 'undefined' ? window : undefined;

    doc?.addEventListener('mousedown', handleMouseDown);
    doc?.addEventListener('keydown', handleKeyDown);
    view?.addEventListener('scroll', handleScroll, true);

    return () => {
      doc?.removeEventListener('mousedown', handleMouseDown);
      doc?.removeEventListener('keydown', handleKeyDown);
      view?.removeEventListener('scroll', handleScroll, true);
    };
  }, [anchorRef, isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const portalContainer = resolvePortalContainer('root', portalHostRef);

  if (!portalContainer) return null;

  return createPortal(
    <div
      ref={popoverRef}
      style={{
        position: 'absolute',
        top: coords.top,
        left: coords.left,
        width,
        boxSizing: 'border-box',
        zIndex: zIndex.modal,
        padding: spacing.md,
        borderRadius: radius.lg,
        border: `1px solid ${colors.border}`,
        background: colors.bgElevated,
        boxShadow: colors.shadowLg,
      }}
    >
      {children}
    </div>,
    portalContainer,
  );
};
