import {
  type ClipboardEvent as ReactClipboardEvent,
  type DragEvent as ReactDragEvent,
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { resolvePrevyuFileUrls } from '../api/files-field';
import { useTheme } from '../theme/ThemeContext';
import type { LineItemFileRef, LineItemRow } from '../types';
import { usePortalHost } from '../ui/PortalHostContext';
import { measureElementInRoot, type RectLike } from '../utils/anchored-overlay';
import {
  calibrateBoardClientOrigin,
  clientPointToBoardLocal,
  measureAnchorInBoard,
} from '../utils/board-client-origin';
import { findOpportunityInCache } from '../utils/opportunity-cache';
import { openOkleykaDialogForLineItem } from '../utils/open-okleyka-dialog';
import { PrevyuFilesPopover } from './prevyu/PrevyuFilesPopover';
import { PrevyuHoverPreview } from './prevyu/PrevyuHoverPreview';
import { PrevyuUploadModal } from './prevyu/PrevyuUploadModal';
import { usePrevyuMediaActions } from './prevyu/usePrevyuMediaActions';

type PrevyuOkleykiCellProps = {
  itemId: string;
  opportunityId?: string;
  stage?: string | null;
  value?: LineItemFileRef[] | null;
  row?: Record<string, unknown>;
};

const THUMB_SIZE = 40;

export const PrevyuOkleykiCell = ({
  itemId,
  opportunityId,
  stage,
  value,
  row,
}: PrevyuOkleykiCellProps) => {
  const theme = useTheme();
  const { colors, font, radius } = theme;
  const queryClient = useQueryClient();
  const portalHostRef = usePortalHost();

  const files = value ?? [];
  const urls = resolvePrevyuFileUrls(files);
  const primaryUrl = urls[0] ?? null;
  const extraCount = Math.max(0, files.length - 1);
  const hasFiles = files.length > 0;
  const actions = usePrevyuMediaActions({ itemId, files });
  const thumbRef = useRef<HTMLButtonElement>(null);
  const [hoverAnchor, setHoverAnchor] = useState<RectLike | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [popoverAnchor, setPopoverAnchor] = useState<RectLike | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [imageBroken, setImageBroken] = useState(false);

  const resolvedOpportunityId =
    opportunityId ||
    (typeof row?.opportunityId === 'string' ? row.opportunityId : undefined);
  const itemName = typeof row?.name === 'string' ? row.name : undefined;

  const rootEl = () => portalHostRef?.current ?? null;

  const measureThumb = useCallback((): RectLike | null => {
    return measureAnchorInBoard(thumbRef.current, rootEl());
  }, [portalHostRef]);

  const syncOriginFromPointer = useCallback(
    (event: ReactMouseEvent) => {
      const root = rootEl();
      const offsetBox = measureElementInRoot(thumbRef.current, root);
      if (!offsetBox || (offsetBox.left <= 1 && offsetBox.top <= 1)) {
        // Offset walk unusable — rely on resolveBoardClientOrigin (root/iframe/chrome).
        return;
      }
      const native = event.nativeEvent as MouseEvent & {
        offsetX?: number;
        offsetY?: number;
      };
      calibrateBoardClientOrigin({
        clientX: event.clientX,
        clientY: event.clientY,
        offsetX: typeof native.offsetX === 'number' ? native.offsetX : 0,
        offsetY: typeof native.offsetY === 'number' ? native.offsetY : 0,
        targetInRoot: { x: offsetBox.left, y: offsetBox.top },
      });
    },
    [portalHostRef],
  );

  const updateHoverFromPointer = useCallback(
    (event: ReactMouseEvent) => {
      syncOriginFromPointer(event);
      const local = clientPointToBoardLocal(
        { x: event.clientX, y: event.clientY },
        rootEl(),
      );
      // Degenerate rect at the cursor — preview sits just to the right of it.
      setHoverAnchor({
        left: local.x,
        top: local.y,
        right: local.x,
        bottom: local.y,
        width: 0,
        height: 0,
      });
    },
    [syncOriginFromPointer, portalHostRef],
  );

  useEffect(() => {
    setImageBroken(false);
  }, [primaryUrl]);

  const openUploadModal = () => {
    setPopoverOpen(false);
    setHoverAnchor(null);
    setUploadOpen(true);
  };

  const handleOpenOkleyka = (event: ReactMouseEvent) => {
    event.stopPropagation();
    if (!resolvedOpportunityId) return;
    const opportunity = findOpportunityInCache(queryClient, resolvedOpportunityId);
    if (!opportunity) return;
    const lineItem = {
      ...(row as LineItemRow),
      id: itemId,
      opportunityId: resolvedOpportunityId,
      name: itemName ?? '',
      prevyuOkleyki: files,
      stage: stage ?? (typeof row?.stage === 'string' ? row.stage : null),
    } satisfies LineItemRow;
    openOkleykaDialogForLineItem(opportunity, lineItem);
  };

  const handleDragOver = (event: ReactDragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event: ReactDragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    void actions.addFromDataTransfer(event.dataTransfer);
  };

  const handlePaste = (event: ReactClipboardEvent) => {
    event.preventDefault();
    event.stopPropagation();
    // Remote DOM usually cannot read image bytes — fall back to the upload modal
    // (main-thread iframe) where Ctrl+V works after focus.
    void (async () => {
      const ok = await actions.addFromPasteEvent(event.clipboardData);
      if (!ok) openUploadModal();
    })();
  };

  const handleThumbClick = (event: ReactMouseEvent) => {
    if (!hasFiles) {
      openUploadModal();
      return;
    }
    setHoverAnchor(null);
    if (popoverOpen) {
      setPopoverOpen(false);
      return;
    }
    syncOriginFromPointer(event);
    setPopoverAnchor(measureThumb());
    setPopoverOpen(true);
  };

  const showThumbnail = Boolean(primaryUrl && !imageBroken);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        minWidth: 0,
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        ref={thumbRef}
        type="button"
        disabled={actions.isPending}
        data-prevyu-cell={hasFiles ? 'filled' : 'empty'}
        title={hasFiles ? 'Управление превью' : 'Добавить превью'}
        onClick={handleThumbClick}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onPaste={handlePaste}
        onMouseEnter={
          showThumbnail && !popoverOpen ? updateHoverFromPointer : undefined
        }
        onMouseMove={
          showThumbnail && !popoverOpen ? updateHoverFromPointer : undefined
        }
        onMouseLeave={showThumbnail ? () => setHoverAnchor(null) : undefined}
        style={{
          position: 'relative',
          width: THUMB_SIZE,
          height: THUMB_SIZE,
          flexShrink: 0,
          borderRadius: radius.sm,
          overflow: 'hidden',
          border: `1px solid ${hasFiles ? colors.border : colors.borderSubtle}`,
          backgroundColor: colors.bgInset,
          cursor: actions.isPending ? 'wait' : 'pointer',
          padding: 0,
          boxSizing: 'border-box',
        }}
      >
        {showThumbnail ? (
          <img
            src={primaryUrl!}
            alt=""
            draggable={false}
            onError={() => setImageBroken(true)}
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              pointerEvents: 'none',
            }}
          />
        ) : hasFiles ? (
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              color: colors.textMuted,
              fontSize: font.sizeXs,
              lineHeight: 1.1,
              padding: 2,
            }}
          >
            нет превью
          </span>
        ) : (
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              color: colors.textMuted,
              fontSize: font.sizeLg,
              lineHeight: 1,
            }}
          >
            +
          </span>
        )}

        {extraCount > 0 ? (
          <span
            style={{
              position: 'absolute',
              right: 2,
              bottom: 2,
              minWidth: 14,
              height: 14,
              padding: '0 3px',
              borderRadius: radius.pill,
              backgroundColor: colors.bgElevated,
              border: `1px solid ${colors.borderSubtle}`,
              color: colors.textSecondary,
              fontSize: 9,
              fontWeight: font.weightSemibold,
              lineHeight: '12px',
              textAlign: 'center',
              pointerEvents: 'none',
            }}
          >
            +{extraCount}
          </span>
        ) : null}
      </button>

      {hoverAnchor && showThumbnail && !popoverOpen && !uploadOpen ? (
        <PrevyuHoverPreview
          url={primaryUrl!}
          anchor={hoverAnchor}
          onClose={() => setHoverAnchor(null)}
        />
      ) : null}

      <PrevyuFilesPopover
        files={files}
        urls={urls}
        open={popoverOpen}
        anchor={popoverAnchor}
        onClose={() => setPopoverOpen(false)}
        onMakeFirst={(fileId) => void actions.makeFirst(fileId)}
        onRemove={(fileId) => void actions.removeFile(fileId)}
        onAddClick={openUploadModal}
        isPending={actions.isPending}
      />

      <PrevyuUploadModal
        itemId={itemId}
        itemName={itemName}
        files={files}
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
      />

      {stage === 'OKLEYKA' ? (
        <button
          type="button"
          onClick={handleOpenOkleyka}
          style={{
            alignSelf: 'flex-start',
            border: 'none',
            background: 'transparent',
            color: colors.accent,
            fontSize: font.sizeSm,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          В оклейку…
        </button>
      ) : null}
    </div>
  );
};
