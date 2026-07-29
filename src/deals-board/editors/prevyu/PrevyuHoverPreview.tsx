import { useEffect } from 'react';
import { createPortal } from 'react-dom';

import { useTheme } from '../../theme/ThemeContext';
import { resolvePortalContainer, usePortalHost } from '../../ui/PortalHostContext';
import {
  resolveHoverPreviewPosition,
  type RectLike,
} from '../../utils/anchored-overlay';

export type PrevyuHoverPreviewProps = {
  url: string;
  /** Root-local thumb box from measureElementInRoot (not client rects). */
  anchor: RectLike | null;
  onClose: () => void;
};

const PREVIEW_MAX = 280;

/**
 * Floating preview portaled to the board root so table overflow cannot clip it.
 * Positioned from offset-based root-local anchor (Remote DOM–safe).
 */
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

  const root = portalHostRef?.current ?? null;
  const rootWidth = root && 'clientWidth' in root ? Number(root.clientWidth) || 0 : 0;
  const rootHeight = root && 'clientHeight' in root ? Number(root.clientHeight) || 0 : 0;
  const { top, left } = resolveHoverPreviewPosition(
    anchor,
    PREVIEW_MAX,
    rootWidth || 1200,
    rootHeight || 800,
  );

  const preview = (
    <div
      data-prevyu-hover-preview
      style={{
        position: 'absolute',
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
