import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import { useTheme } from '../theme/ThemeContext';
import { usePortalHost } from '../ui/PortalHostContext';

export const ProductionPhotoLightbox = ({
  url,
  onClose,
}: {
  url: string;
  onClose: () => void;
}) => {
  const { colors, radius, zIndex } = useTheme();
  const portalHostRef = usePortalHost();
  const frameRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const focus = (frameRef.current as { focus?: () => void } | null)?.focus;
    if (typeof focus === 'function') focus();
    const view = typeof window !== 'undefined' ? window : undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    view?.addEventListener('keydown', onKey);
    return () => view?.removeEventListener('keydown', onKey);
  }, [onClose]);

  const frame = (
    <div
      ref={frameRef}
      role="dialog"
      aria-modal="true"
      aria-label="Фото"
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
      }}
      onClick={(event) => {
        event.stopPropagation();
        onClose();
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: zIndex.modal + 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        boxSizing: 'border-box',
        background: colors.overlay,
        outline: 'none',
      }}
    >
      <img
        src={url}
        alt=""
        draggable={false}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
          borderRadius: radius.md,
          boxShadow: colors.shadowLg,
          background: colors.bgElevated,
        }}
      />
    </div>
  );

  const host = portalHostRef?.current;
  if (host) return createPortal(frame, host);
  return frame;
};
