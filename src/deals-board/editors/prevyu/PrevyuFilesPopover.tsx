import { useEffect, type MouseEvent as ReactMouseEvent } from 'react';
import { createPortal } from 'react-dom';

import { useTheme } from '../../theme/ThemeContext';
import type { LineItemFileRef } from '../../types';
import { Button } from '../../ui/Button';
import { resolvePortalContainer, usePortalHost } from '../../ui/PortalHostContext';

export type PrevyuFilesPopoverProps = {
  files: LineItemFileRef[];
  urls: string[];
  open: boolean;
  anchorRect: DOMRect | null;
  onClose: () => void;
  onMakeFirst: (fileId: string) => void;
  onRemove: (fileId: string) => void;
  onAddClick: () => void;
  isPending: boolean;
};

const THUMB_SIZE = 40;
const POPOVER_GAP = 4;
const VIEWPORT_MARGIN = 8;
const POPOVER_MIN_WIDTH = 220;
const POPOVER_MAX_WIDTH = 280;
const POPOVER_ESTIMATED_HEIGHT = 200;

const getViewportSize = () => {
  if (typeof window === 'undefined') {
    return { width: 0, height: 0 };
  }
  return { width: window.innerWidth, height: window.innerHeight };
};

const computePopoverStyle = (anchorRect: DOMRect | null) => {
  if (!anchorRect) {
    return { top: 0, left: 0, transform: undefined as string | undefined };
  }

  const { width: viewportWidth, height: viewportHeight } = getViewportSize();
  let top = anchorRect.bottom + POPOVER_GAP;
  let transform: string | undefined;

  if (top + POPOVER_ESTIMATED_HEIGHT > viewportHeight - VIEWPORT_MARGIN) {
    top = anchorRect.top - POPOVER_GAP;
    transform = 'translateY(-100%)';
  }

  let left = anchorRect.left;
  left = Math.min(left, viewportWidth - POPOVER_MAX_WIDTH - VIEWPORT_MARGIN);
  left = Math.max(VIEWPORT_MARGIN, left);

  return { top, left, transform };
};

export const PrevyuFilesPopover = ({
  files,
  urls,
  open,
  anchorRect,
  onClose,
  onMakeFirst,
  onRemove,
  onAddClick,
  isPending,
}: PrevyuFilesPopoverProps) => {
  const theme = useTheme();
  const portalHostRef = usePortalHost();
  const { colors, font, spacing, radius, zIndex } = theme;

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    const view = typeof window !== 'undefined' ? window : undefined;
    view?.addEventListener?.('keydown', handleKeyDown);
    return () => view?.removeEventListener?.('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const stopBubble = (event: ReactMouseEvent) => {
    event.stopPropagation();
  };

  const { top, left, transform } = computePopoverStyle(anchorRect);

  const panel = (
    <div
      role="dialog"
      aria-label="Файлы превью"
      data-prevyu-files-popover
      onClick={stopBubble}
      onMouseDown={stopBubble}
      style={{
        position: 'fixed',
        top,
        left,
        transform,
        zIndex: zIndex.dropdown,
        minWidth: POPOVER_MIN_WIDTH,
        maxWidth: POPOVER_MAX_WIDTH,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.lg,
        backgroundColor: colors.bgElevated,
        boxShadow: colors.shadowLg,
        padding: spacing.sm,
        boxSizing: 'border-box',
      }}
    >
      {files.length > 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: spacing.xs,
            maxHeight: 240,
            overflowY: 'auto',
            marginBottom: spacing.sm,
          }}
        >
          {files.map((file, index) => {
            const url = urls[index] ?? '';
            const isFirst = index === 0;

            return (
              <div
                key={file.fileId}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: spacing.xs,
                  padding: spacing.xs,
                  borderRadius: radius.sm,
                  backgroundColor: isFirst ? colors.accentMuted : 'transparent',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                  <div
                    style={{
                      width: THUMB_SIZE,
                      height: THUMB_SIZE,
                      flexShrink: 0,
                      borderRadius: radius.sm,
                      overflow: 'hidden',
                      border: `1px solid ${colors.borderSubtle}`,
                      backgroundColor: colors.bgInset,
                    }}
                  >
                    {url ? (
                      <img
                        src={url}
                        alt=""
                        draggable={false}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: font.sizeXs,
                          color: colors.textMuted,
                        }}
                      >
                        —
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                      fontSize: font.sizeXs,
                      color: colors.textSecondary,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={file.label ?? file.fileId}
                  >
                    {file.label ?? `#${index + 1}`}
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.xs }}>
                  {!isFirst ? (
                    <Button
                      theme={theme}
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => onMakeFirst(file.fileId)}
                    >
                      Сделать первым
                    </Button>
                  ) : null}
                  <Button
                    theme={theme}
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    onClick={() => onRemove(file.fileId)}
                    style={{ color: colors.danger }}
                  >
                    Удалить
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <Button
        theme={theme}
        variant="secondary"
        size="sm"
        disabled={isPending}
        onClick={onAddClick}
        style={{ width: '100%' }}
      >
        Добавить
      </Button>
    </div>
  );

  const container = resolvePortalContainer('root', portalHostRef);
  return container ? createPortal(panel, container) : panel;
};
