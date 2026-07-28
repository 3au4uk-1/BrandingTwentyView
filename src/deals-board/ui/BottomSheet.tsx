import { useEffect, type PointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import type { ThemeTokens } from '../theme/tokens';
import { Button } from './Button';
import { resolvePortalContainer, usePortalHost } from './PortalHostContext';

type BottomSheetProps = {
  theme: ThemeTokens;
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Fraction of viewport height for sheet panel. Default 0.85 */
  heightFraction?: number;
  /**
   * Where to mount the overlay.
   * - inline: render in place (best for Twenty Remote DOM mobile UI)
   * - root: portal into the board host
   * - body: document.body
   */
  portalTarget?: 'body' | 'root' | 'inline';
};

export const BottomSheet = ({
  theme,
  isOpen,
  title,
  onClose,
  children,
  heightFraction = 0.85,
  portalTarget = 'root',
}: BottomSheetProps) => {
  const portalHostRef = usePortalHost();
  const { colors, radius, font, spacing, zIndex } = theme;
  const overlayBg =
    theme.colors.overlay;

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    const view = typeof window !== 'undefined' ? window : undefined;
    view?.addEventListener('keydown', handleKeyDown);
    return () => view?.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    onClose();
  };

  const sheet = (
    <div
      role="presentation"
      data-bottom-sheet-overlay
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: zIndex.modal,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        pointerEvents: 'auto',
      }}
    >
      <div
        aria-hidden="true"
        onPointerUp={handleBackdropPointerUp}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: overlayBg,
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onPointerUp={(event) => event.stopPropagation()}
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          maxHeight: `${Math.round(heightFraction * 100)}dvh`,
          borderTopLeftRadius: radius.lg,
          borderTopRightRadius: radius.lg,
          border: `1px solid ${colors.border}`,
          borderBottom: 'none',
          backgroundColor: colors.bgElevated,
          color: colors.text,
          boxShadow: colors.shadowLg,
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: `${spacing.md} ${spacing.md} ${spacing.sm}`,
            borderBottom: `1px solid ${colors.borderSubtle}`,
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: font.sizeMd, fontWeight: font.weightSemibold }}>{title}</div>
          <Button theme={theme} variant="ghost" size="sm" onClick={onClose}>
            Готово
          </Button>
        </div>
        <div style={{ overflow: 'auto', padding: spacing.md, flex: 1, minHeight: 0 }}>{children}</div>
      </div>
    </div>
  );

  if (portalTarget === 'inline') {
    return sheet;
  }

  const container = resolvePortalContainer(portalTarget, portalHostRef);
  if (container) return createPortal(sheet, container);
  return sheet;
};
