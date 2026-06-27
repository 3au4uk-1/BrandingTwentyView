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

type RectLike = Pick<DOMRect, 'top' | 'left' | 'bottom' | 'right' | 'width' | 'height'>;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const getViewportSize = () => {
  const view = typeof window !== 'undefined' ? window : undefined;
  return {
    width: view?.innerWidth ?? 1280,
    height: view?.innerHeight ?? 720,
  };
};

const getElementClientRect = (element: HTMLElement, anchorPoint?: AnchorPoint | null): RectLike => {
  if (typeof element.getBoundingClientRect === 'function') {
    return element.getBoundingClientRect();
  }

  const width = element.offsetWidth ?? element.clientWidth ?? 120;
  const height = element.offsetHeight ?? element.clientHeight ?? 24;

  if (anchorPoint) {
    return {
      top: anchorPoint.y,
      left: anchorPoint.x,
      bottom: anchorPoint.y + height,
      right: anchorPoint.x + width,
      width,
      height,
    };
  }

  return {
    top: 80,
    left: 80,
    bottom: 80 + height,
    right: 80 + width,
    width,
    height,
  };
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
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState<PopoverCoords>({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!isOpen || !anchorRef.current) return;

    const updatePosition = () => {
      const anchor = anchorRef.current;
      const popover = popoverRef.current;
      if (!anchor) return;

      const rect = getElementClientRect(anchor, anchorPoint);
      const popoverHeight = popover?.offsetHeight ?? 220;
      const viewport = getViewportSize();
      const spaceBelow = viewport.height - rect.bottom;
      const showAbove = spaceBelow < popoverHeight + 12 && rect.top > popoverHeight + 12;
      const top = showAbove ? rect.top - popoverHeight - 4 : rect.bottom + 4;
      const left = clamp(rect.left, 8, viewport.width - width - 8);

      setCoords({ top, left });
    };

    updatePosition();
    const view = typeof window !== 'undefined' ? window : undefined;
    view?.addEventListener('resize', updatePosition);
    return () => view?.removeEventListener('resize', updatePosition);
  }, [anchorPoint, anchorRef, isOpen, width, children]);

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

    const handleScroll = () => onClose();

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

  return createPortal(
    <div
      ref={popoverRef}
      style={{
        position: 'fixed',
        top: coords.top,
        left: coords.left,
        width,
        zIndex: zIndex.dropdown,
        padding: spacing.md,
        borderRadius: radius.lg,
        border: `1px solid ${colors.border}`,
        background: colors.bgElevated,
        boxShadow: colors.shadowLg,
      }}
    >
      {children}
    </div>,
    document.body,
  );
};
