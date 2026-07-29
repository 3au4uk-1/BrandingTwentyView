import { useEffect, type MouseEvent as ReactMouseEvent } from 'react';
import { createPortal } from 'react-dom';

import { useTheme } from '../../theme/ThemeContext';
import type { LineItemFileRef } from '../../types';
import { Button } from '../../ui/Button';
import { resolvePortalContainer, usePortalHost } from '../../ui/PortalHostContext';
import {
  resolveAnchoredOverlayPosition,
  type RectLike,
} from '../../utils/anchored-overlay';

export type PrevyuFilesPopoverProps = {
  files: LineItemFileRef[];
  urls: string[];
  open: boolean;
  /** Root-local thumb box from measureElementInRoot. */
  anchor: RectLike | null;
  onClose: () => void;
  onMakeFirst: (fileId: string) => void;
  onRemove: (fileId: string) => void;
  onAddClick: () => void;
  isPending: boolean;
};

const THUMB_SIZE = 40;
const POPOVER_MIN_WIDTH = 220;
const POPOVER_MAX_WIDTH = 280;
const POPOVER_ESTIMATED_HEIGHT = 220;

/**
 * Files panel portaled to the board root (escapes table overflow) and placed
 * above the thumb using offset-based root-local geometry.
 */
export const PrevyuFilesPopover = ({
  files,
  urls,
  open,
  anchor,
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

  const root = portalHostRef?.current ?? null;
  const rootWidth = root && 'clientWidth' in root ? Number(root.clientWidth) || 0 : 0;
  const rootHeight = root && 'clientHeight' in root ? Number(root.clientHeight) || 0 : 0;

  const placed = anchor
    ? resolveAnchoredOverlayPosition({
        anchor,
        overlayWidth: POPOVER_MAX_WIDTH,
        overlayHeight: POPOVER_ESTIMATED_HEIGHT,
        rootWidth: rootWidth || 1200,
        rootHeight: rootHeight || 800,
        preferAbove: true,
      })
    : { top: 16, left: 16, transform: undefined as string | undefined };

  const backdrop = (
    <div
      data-prevyu-files-backdrop
      aria-hidden="true"
      onMouseDown={onClose}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: zIndex.dropdown,
        backgroundColor: 'transparent',
      }}
    />
  );

  const panel = (
    <div
      role="dialog"
      aria-label="Файлы превью"
      data-prevyu-files-popover
      onClick={stopBubble}
      onMouseDown={stopBubble}
      style={{
        position: 'absolute',
        top: placed.top,
        left: placed.left,
        transform: placed.transform,
        zIndex: zIndex.dropdown + 1,
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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.sm,
          marginBottom: spacing.sm,
        }}
      >
        <span
          style={{
            fontSize: font.sizeSm,
            fontWeight: font.weightSemibold,
            color: colors.text,
          }}
        >
          Превью
        </span>
        <Button theme={theme} variant="ghost" size="sm" onClick={onClose}>
          Закрыть
        </Button>
      </div>

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
  if (!container) {
    return (
      <>
        {backdrop}
        {panel}
      </>
    );
  }

  return (
    <>
      {createPortal(backdrop, container)}
      {createPortal(panel, container)}
    </>
  );
};
