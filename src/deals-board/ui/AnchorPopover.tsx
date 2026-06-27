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

type AnchorPopoverProps = {
  theme: ThemeTokens;
  isOpen: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  children: ReactNode;
  width?: number;
};

type PopoverCoords = {
  top: number;
  left: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const AnchorPopover = ({
  theme,
  isOpen,
  onClose,
  anchorRef,
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

      const rect = anchor.getBoundingClientRect();
      const popoverHeight = popover?.offsetHeight ?? 220;
      const spaceBelow = window.innerHeight - rect.bottom;
      const showAbove = spaceBelow < popoverHeight + 12 && rect.top > popoverHeight + 12;
      const top = showAbove ? rect.top - popoverHeight - 4 : rect.bottom + 4;
      const left = clamp(rect.left, 8, window.innerWidth - width - 8);

      setCoords({ top, left });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [anchorRef, isOpen, width, children]);

  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      onClose();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    const handleScroll = () => onClose();

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [anchorRef, isOpen, onClose]);

  if (!isOpen) return null;

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
