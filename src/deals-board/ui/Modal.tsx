import type { MouseEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';

import type { ThemeTokens } from '../theme/tokens';
import { resolvePortalContainer, usePortalHost } from './PortalHostContext';
import { Button } from './Button';

type ModalProps = {
  theme: ThemeTokens;
  isOpen: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** Where to mount the overlay. Default: document.body. Use "root" for nested cell editors. */
  portalTarget?: 'body' | 'root' | 'inline';
};

export const Modal = ({
  theme,
  isOpen,
  title,
  description,
  onClose,
  children,
  footer,
  portalTarget = 'body',
}: ModalProps) => {
  const portalHostRef = usePortalHost();

  if (!isOpen) return null;

  const { colors, radius, font, spacing, zIndex } = theme;
  const overlayBg =
    theme.colorScheme === 'dark' ? 'rgba(0, 0, 0, 0.72)' : 'rgba(24, 24, 27, 0.32)';

  const handleBackdropMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const modal = (
    <div
      role="presentation"
      onMouseDown={handleBackdropMouseDown}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: zIndex.modal,
        backgroundColor: overlayBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
        boxSizing: 'border-box',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '440px',
          border: `1px solid ${colors.border}`,
          borderRadius: radius.lg,
          backgroundColor: colors.bgElevated,
          color: colors.text,
          boxShadow: colors.shadowLg,
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: `${spacing.lg} ${spacing.lg} ${spacing.md}` }}>
          <div style={{ fontSize: font.sizeLg, fontWeight: font.weightSemibold }}>{title}</div>
          {description ? (
            <p
              style={{
                margin: `${spacing.sm} 0 0`,
                fontSize: font.sizeSm,
                color: colors.textMuted,
                lineHeight: 1.5,
              }}
            >
              {description}
            </p>
          ) : null}
        </div>

        <div style={{ padding: `0 ${spacing.lg} ${spacing.lg}` }}>{children}</div>

        {footer ?? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: spacing.sm,
              padding: spacing.md,
              borderTop: `1px solid ${colors.borderSubtle}`,
              backgroundColor: colors.bgSecondary,
            }}
          >
            <Button theme={theme} variant="ghost" size="sm" onClick={onClose}>
              Закрыть
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  if (portalTarget === 'inline') {
    return modal;
  }

  const container = resolvePortalContainer(portalTarget, portalHostRef);
  if (container) {
    return createPortal(modal, container);
  }

  return modal;
};
