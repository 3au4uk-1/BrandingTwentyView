import {
  type ChangeEvent as ReactChangeEvent,
  type ClipboardEvent as ReactClipboardEvent,
  type DragEvent as ReactDragEvent,
  type MouseEvent as ReactMouseEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { resolvePrevyuFileUrls } from '../api/files-field';
import { useTheme } from '../theme/ThemeContext';
import type { LineItemFileRef, LineItemRow } from '../types';
import { openOkleykaDialogForLineItem } from '../utils/open-okleyka-dialog';
import { openRecordSidePanel } from '../utils/open-record-side-panel';
import { findOpportunityInCache } from '../utils/sync-deal-stage';
import { PrevyuFilesPopover } from './prevyu/PrevyuFilesPopover';
import { PrevyuHoverPreview } from './prevyu/PrevyuHoverPreview';
import { triggerHiddenFileInput } from './prevyu/trigger-hidden-file-input';
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

  const files = value ?? [];
  const urls = resolvePrevyuFileUrls(files);
  const primaryUrl = urls[0] ?? null;
  const extraCount = Math.max(0, files.length - 1);
  const hasFiles = files.length > 0;
  const actions = usePrevyuMediaActions({ itemId, files });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cellRef = useRef<HTMLDivElement>(null);
  const [hoverAnchor, setHoverAnchor] = useState<{ x: number; y: number } | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [popoverAnchorRect, setPopoverAnchorRect] = useState<DOMRect | null>(null);
  const [imageBroken, setImageBroken] = useState(false);

  const resolvedOpportunityId =
    opportunityId ||
    (typeof row?.opportunityId === 'string' ? row.opportunityId : undefined);

  useEffect(() => {
    setImageBroken(false);
  }, [primaryUrl]);

  useEffect(() => {
    if (!popoverOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (cellRef.current?.contains(target)) return;
      if (target instanceof Element && target.closest('[data-prevyu-files-popover]')) return;
      setPopoverOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [popoverOpen]);

  const openFilePicker = () => {
    // Remote DOM proxies are truthy but often lack real DOM methods — `?.click`
    // still throws TypeError: click is not a function.
    triggerHiddenFileInput(fileInputRef.current, () => {
      void openRecordSidePanel('dealLineItem', itemId);
    });
  };

  const openPopover = () => {
    const el = cellRef.current;
    let rect: DOMRect | null = null;
    if (el && typeof el.getBoundingClientRect === 'function') {
      try {
        rect = el.getBoundingClientRect();
      } catch {
        rect = null;
      }
    }
    setPopoverAnchorRect(rect);
    setPopoverOpen(true);
  };

  const handleFileInputChange = (event: ReactChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files;
    if (selected?.length) {
      void actions.addFiles(Array.from(selected));
    }
    event.target.value = '';
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
      name: typeof row?.name === 'string' ? row.name : '',
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

  const handlePaste = (_event: ReactClipboardEvent) => {
    void actions.addFromClipboard();
  };

  const handleThumbClick = () => {
    if (hasFiles) {
      openPopover();
    } else {
      openFilePicker();
    }
  };

  const updateHoverAnchor = (event: ReactMouseEvent) => {
    setHoverAnchor({ x: event.clientX, y: event.clientY });
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
      <div
        ref={cellRef}
        style={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileInputChange}
        />

        <button
          type="button"
          disabled={actions.isPending}
          data-prevyu-cell={hasFiles ? 'filled' : 'empty'}
          title={hasFiles ? 'Управление превью' : 'Добавить превью'}
          onClick={handleThumbClick}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onPaste={handlePaste}
          onMouseEnter={showThumbnail ? updateHoverAnchor : undefined}
          onMouseMove={showThumbnail ? updateHoverAnchor : undefined}
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

        {hoverAnchor && showThumbnail ? (
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
          anchorRect={popoverAnchorRect}
          onClose={() => setPopoverOpen(false)}
          onMakeFirst={(fileId) => void actions.makeFirst(fileId)}
          onRemove={(fileId) => void actions.removeFile(fileId)}
          onAddClick={openFilePicker}
          isPending={actions.isPending}
        />
      </div>

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

