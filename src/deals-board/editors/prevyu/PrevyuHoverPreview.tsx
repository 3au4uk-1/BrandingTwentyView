import { useEffect } from 'react';
import { createPortal } from 'react-dom';

import { useTheme } from '../../theme/ThemeContext';
import { resolvePortalContainer, usePortalHost } from '../../ui/PortalHostContext';
import { clientPointToRootOffset } from '../../utils/anchored-overlay';

export type PrevyuHoverPreviewProps = {
  url: string;
  /** clientX / clientY from the pointer event (any shared coordinate space). */
  anchor: { x: number; y: number } | null;
  onClose: () => void;
};

const PREVIEW_MAX = 280;
const ROOT_MARGIN = 12;
const CURSOR_OFFSET = 12;

/**
 * Floating thumbnail preview. Uses root-relative `absolute` (not `fixed`) so
 * Twenty Remote DOM does not pin the image to the host page top-left / sidebar.
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
  const local = clientPointToRootOffset(anchor, root);
  const rootWidth = root && 'clientWidth' in root ? Number(root.clientWidth) || 0 : 0;
  const rootHeight = root && 'clientHeight' in root ? Number(root.clientHeight) || 0 : 0;

  let left = local.x + CURSOR_OFFSET;
  let top = local.y + CURSOR_OFFSET;
  if (rootWidth > 0) {
    left = Math.min(left, Math.max(ROOT_MARGIN, rootWidth - PREVIEW_MAX - ROOT_MARGIN));
  }
  if (rootHeight > 0) {
    top = Math.min(top, Math.max(ROOT_MARGIN, rootHeight - PREVIEW_MAX - ROOT_MARGIN));
  }
  left = Math.max(ROOT_MARGIN, left);
  top = Math.max(ROOT_MARGIN, top);

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
