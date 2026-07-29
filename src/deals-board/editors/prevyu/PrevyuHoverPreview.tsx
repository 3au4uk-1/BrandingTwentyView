import { useEffect, type MouseEvent as ReactMouseEvent } from 'react';

import { useTheme } from '../../theme/ThemeContext';

export type PrevyuHoverPreviewProps = {
  url: string;
  /** When false, render nothing. */
  open: boolean;
  onClose: () => void;
};

const PREVIEW_MAX = 280;

/**
 * Enlarged preview next to the thumb.
 * CSS-anchored (no clientX / getBoundingClientRect) — Remote DOM mixes host-page
 * pointer coords with widget-local rects, which shifted the portal image sideways.
 */
export const PrevyuHoverPreview = ({ url, open, onClose }: PrevyuHoverPreviewProps) => {
  const theme = useTheme();
  const { colors, radius, zIndex } = theme;

  useEffect(() => {
    if (!open) return;

    const handleDismiss = () => onClose();
    const view = typeof window !== 'undefined' ? window : undefined;
    view?.addEventListener?.('scroll', handleDismiss, true);
    view?.addEventListener?.('blur', handleDismiss);
    return () => {
      view?.removeEventListener?.('scroll', handleDismiss, true);
      view?.removeEventListener?.('blur', handleDismiss);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      data-prevyu-hover-preview
      onMouseEnter={(event: ReactMouseEvent) => {
        // Keep preview while crossing the gap from thumb → preview is not needed
        // (pointerEvents none); dismiss stays on thumb mouseLeave.
        event.stopPropagation();
      }}
      style={{
        position: 'absolute',
        left: '100%',
        top: 0,
        marginLeft: 8,
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
};
