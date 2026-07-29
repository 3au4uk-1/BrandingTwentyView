import {
  type ChangeEvent as ReactChangeEvent,
  type ClipboardEvent as ReactClipboardEvent,
  type DragEvent as ReactDragEvent,
  useEffect,
  useRef,
} from 'react';

import {
  collectImageFilesFromDataTransfer,
  resolvePrevyuFileUrls,
} from '../../api/files-field';
import { useTheme } from '../../theme/ThemeContext';
import type { LineItemFileRef } from '../../types';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { openRecordSidePanel } from '../../utils/open-record-side-panel';
import { usePrevyuMediaActions } from './usePrevyuMediaActions';

export type PrevyuUploadModalProps = {
  itemId: string;
  itemName?: string;
  files: LineItemFileRef[] | null | undefined;
  isOpen: boolean;
  onClose: () => void;
};

/**
 * In-board upload modal (Remote DOM experiment).
 * Real file input under the drop zone (no programmatic .click()).
 * Paste/DnD on a focusable zone. Side panel only via explicit footer button.
 */
export const PrevyuUploadModal = ({
  itemId,
  itemName,
  files,
  isOpen,
  onClose,
}: PrevyuUploadModalProps) => {
  const theme = useTheme();
  const { colors, font, spacing, radius } = theme;
  const pasteZoneRef = useRef<HTMLDivElement>(null);
  const {
    isPending,
    lastError,
    clearError,
    addFiles,
    addFromDataTransfer,
    addFromClipboard,
    makeFirst,
    removeFile,
  } = usePrevyuMediaActions({
    itemId,
    files,
    remoteDomFallback: 'message',
  });
  const urls = resolvePrevyuFileUrls(files);
  const list = files ?? [];

  useEffect(() => {
    if (!isOpen) return;
    clearError();
    const node = pasteZoneRef.current;
    if (node && typeof node.focus === 'function') {
      try {
        node.focus();
      } catch {
        // Remote DOM focus may be unavailable
      }
    }
  }, [isOpen, clearError]);

  const handleFileChange = (event: ReactChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files;
    if (selected?.length) {
      void addFiles(Array.from(selected));
    }
    event.target.value = '';
  };

  const handlePaste = (event: ReactClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const fromEvent = collectImageFilesFromDataTransfer(event.clipboardData);
    if (fromEvent.length) {
      void addFiles(fromEvent);
      return;
    }
    void addFromClipboard();
  };

  const handleDragOver = (event: ReactDragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event: ReactDragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    void addFromDataTransfer(event.dataTransfer);
  };

  return (
    <Modal
      theme={theme}
      isOpen={isOpen}
      title="Превью"
      description={
        itemName
          ? `${itemName} — вставьте скриншот (Ctrl+V), перетащите файл или выберите с диска.`
          : 'Вставьте скриншот (Ctrl+V), перетащите файл или выберите с диска.'
      }
      onClose={onClose}
      portalTarget="root"
      footer={
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: spacing.sm,
            padding: spacing.md,
            borderTop: `1px solid ${colors.borderSubtle}`,
            backgroundColor: colors.bgSecondary,
            flexWrap: 'wrap',
          }}
        >
          <Button
            theme={theme}
            variant="ghost"
            size="sm"
            onClick={() => void openRecordSidePanel('dealLineItem', itemId)}
          >
            Открыть в карточке
          </Button>
          <Button theme={theme} variant="secondary" size="sm" onClick={onClose}>
            Готово
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
        <div
          ref={pasteZoneRef}
          tabIndex={0}
          data-prevyu-upload-zone
          onPaste={handlePaste}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          style={{
            position: 'relative',
            minHeight: 120,
            border: `1px dashed ${colors.borderStrong}`,
            borderRadius: radius.md,
            backgroundColor: colors.bgInset,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.xs,
            padding: spacing.lg,
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={isPending}
            onChange={handleFileChange}
            title="Выбрать файл"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: isPending ? 'wait' : 'pointer',
              fontSize: 0,
            }}
          />
          <span
            style={{
              position: 'relative',
              zIndex: 1,
              pointerEvents: 'none',
              fontSize: font.sizeSm,
              fontWeight: font.weightSemibold,
              color: colors.text,
              textAlign: 'center',
            }}
          >
            {isPending ? 'Загрузка…' : 'Ctrl+V / перетащить / выбрать файл'}
          </span>
          <span
            style={{
              position: 'relative',
              zIndex: 1,
              pointerEvents: 'none',
              fontSize: font.sizeXs,
              color: colors.textMuted,
              textAlign: 'center',
            }}
          >
            До 6 изображений
          </span>
        </div>

        {lastError ? (
          <div
            role="alert"
            style={{
              padding: spacing.sm,
              borderRadius: radius.sm,
              border: `1px solid ${colors.danger}`,
              backgroundColor: colors.dangerMuted,
              color: colors.danger,
              fontSize: font.sizeSm,
              lineHeight: 1.4,
            }}
          >
            {lastError}
          </div>
        ) : null}

        {list.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
            <div
              style={{
                fontSize: font.sizeXs,
                color: colors.textMuted,
                fontWeight: font.weightSemibold,
              }}
            >
              Загружено · {list.length}
            </div>
            {list.map((file, index) => {
              const url = urls[index];
              return (
                <div
                  key={file.fileId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.sm,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: radius.sm,
                      overflow: 'hidden',
                      border: `1px solid ${colors.borderSubtle}`,
                      backgroundColor: colors.bgInset,
                      flexShrink: 0,
                    }}
                  >
                    {url ? (
                      <img
                        src={url}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : null}
                  </div>
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      fontSize: font.sizeXs,
                      color: colors.textMuted,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {file.label || file.fileId}
                    {index === 0 ? ' · первое' : ''}
                  </span>
                  {index > 0 ? (
                    <Button
                      theme={theme}
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => void makeFirst(file.fileId)}
                    >
                      В начало
                    </Button>
                  ) : null}
                  <Button
                    theme={theme}
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    onClick={() => void removeFile(file.fileId)}
                  >
                    Удалить
                  </Button>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </Modal>
  );
};
