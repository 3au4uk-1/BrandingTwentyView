import { useEffect } from 'react';
import { createPortal } from 'react-dom';

import { useTheme } from '../../theme/ThemeContext';
import { resolvePortalContainer, usePortalHost } from '../../ui/PortalHostContext';

export type PrevyuHoverPreviewProps = {
  url: string;
  anchor: { x: number; y: number } | null;
  onClose: () => void;
};

const PREVIEW_MAX = 280;
const VIEWPORT_MARGIN = 300;
const CURSOR_OFFSET = 12;

const getViewportSize = () => {
  if (typeof window === 'undefined') {
    return { width: 0, height: 0 };
  }
  return { width: window.innerWidth, height: window.innerHeight };
};

export const PrevyuHoverPreview = ({ url, anchor, onClose }: PrevyuHoverPreviewProps) => {
  const theme = useTheme();
  const portalHostRef = usePortalHost();
  const { colors, radius, zIndex } = theme;

  useEffect(() => {
    if (!anchor) return;

    const handleDismiss = () => onClose();

    const view = typeof window !== 'undefined' ? window : undefined;
    view?.addEventListener?.('scroll', handleDismiss, true);
    view?.addEventListener?.('blur', handleDismiss);
    return () => {
      view?.removeEventListener?.('scroll', handleDismiss, true);
      view?.removeEventListener?.('blur', handleDismiss);
    };
  }, [anchor, onClose]);

  if (!anchor) return null;

  const { width: viewportWidth, height: viewportHeight } = getViewportSize();
  const left = Math.min(anchor.x + CURSOR_OFFSET, Math.max(0, viewportWidth - VIEWPORT_MARGIN));
  const top = Math.min(anchor.y + CURSOR_OFFSET, Math.max(0, viewportHeight - VIEWPORT_MARGIN));

  const preview = (
    <div
      data-prevyu-hover-preview
      style={{
        position: 'fixed',
        left,
        top,
        zIndex: zIndex.dropdown,
        pointerEvents: 'none',
        borderRadius: radius.md,
        border: `1px solid ${colors.border}`,
        backgroundColor: colors.bgElevated,
        boxShadow: colors.shadowLg,
        overflow: 'hidden',
        lineHeight: 0,
      }}
    >
      <img
        src={url}
        alt=""
        draggable={false}
        style={{
          display: 'block',
          maxWidth: PREVIEW_MAX,
          maxHeight: PREVIEW_MAX,
          width: 'auto',
          height: 'auto',
          objectFit: 'contain',
        }}
      />
    </div>
  );

  const container = resolvePortalContainer('root', portalHostRef);
  return container ? createPortal(preview, container) : preview;
};
