import { useEffect, type MouseEvent, type ReactNode } from 'react';
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
};

export const BottomSheet = ({
  theme,
  isOpen,
  title,
  onClose,
  children,
  heightFraction = 0.85,
}: BottomSheetProps) => {
  const portalHostRef = usePortalHost();
  const { colors, radius, font, spacing, zIndex } = theme;
  const overlayBg =
    theme.colorScheme === 'dark' ? 'rgba(0, 0, 0, 0.72)' : 'rgba(24, 24, 27, 0.32)';

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

  const handleBackdropMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    onClose();
  };

  const sheet = (
    <div
      role="presentation"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: zIndex.modal,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        pointerEvents: 'none',
      }}
    >
      <div
        aria-hidden="true"
        onMouseDown={handleBackdropMouseDown}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: overlayBg,
          pointerEvents: 'auto',
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          maxHeight: `${Math.round(heightFraction * 100)}%`,
          borderTopLeftRadius: radius.lg,
          borderTopRightRadius: radius.lg,
          border: `1px solid ${colors.border}`,
          borderBottom: 'none',
          backgroundColor: colors.bgElevated,
          color: colors.text,
          boxShadow: colors.shadowLg,
          pointerEvents: 'auto',
          overflow: 'hidden',
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

  const container = resolvePortalContainer('root', portalHostRef);
  if (container) return createPortal(sheet, container);
  return sheet;
};
