import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { getPublicAssetUrl } from 'twenty-sdk/utils';

import { useTheme } from '../theme/ThemeContext';
import { resolvePortalContainer, usePortalHost } from './PortalHostContext';
import { registerCancelOtmenaHandler } from '../utils/cancel-otmena-notify';

const AUTO_DISMISS_MS = 3500;

const resolveCancelImageUrl = (): string => {
  try {
    return getPublicAssetUrl('cancel-otmena.png');
  } catch {
    return 'cancel-otmena.png';
  }
};

type CancelOtmenaProviderProps = {
  children: ReactNode;
};

export const CancelOtmenaProvider = ({ children }: CancelOtmenaProviderProps) => {
  const theme = useTheme();
  const portalHostRef = usePortalHost();
  const [isOpen, setIsOpen] = useState(false);
  const { colors, radius, font, spacing, zIndex } = theme;

  useEffect(() => {
    registerCancelOtmenaHandler(() => setIsOpen(true));
    return () => registerCancelOtmenaHandler(null);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    const timer = window.setTimeout(() => setIsOpen(false), AUTO_DISMISS_MS);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const popup = isOpen ? (
    <div
      role="presentation"
      data-cancel-otmena-popup
      onClick={() => setIsOpen(false)}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: zIndex.modal,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.lg,
        boxSizing: 'border-box',
        backgroundColor:
          theme.colorScheme === 'dark' ? 'rgba(0, 0, 0, 0.72)' : 'rgba(24, 24, 27, 0.32)',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Сделка отменена"
        onClick={(event) => event.stopPropagation()}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: spacing.sm,
          maxWidth: 320,
          width: '100%',
          padding: spacing.md,
          borderRadius: radius.lg,
          border: `1px solid ${colors.border}`,
          backgroundColor: colors.bgElevated,
          boxShadow: colors.shadowLg,
        }}
      >
        <div
          style={{
            fontSize: font.sizeMd,
            fontWeight: font.weightSemibold,
            color: colors.text,
          }}
        >
          Сделка отменена
        </div>
        <img
          src={resolveCancelImageUrl()}
          alt=""
          style={{
            display: 'block',
            width: '100%',
            maxWidth: 280,
            height: 'auto',
            borderRadius: radius.md,
          }}
        />
      </div>
    </div>
  ) : null;

  const container = resolvePortalContainer('root', portalHostRef);
  const portal = popup && container ? createPortal(popup, container) : popup;

  return (
    <>
      {children}
      {portal}
    </>
  );
};
