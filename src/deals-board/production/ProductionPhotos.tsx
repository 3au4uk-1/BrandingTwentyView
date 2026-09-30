import {
  type ClipboardEvent as ReactClipboardEvent,
  type DragEvent as ReactDragEvent,
  useState,
} from 'react';

import { resolvePrevyuFileUrls } from '../api/files-field';
import { PrevyuUploadModal } from '../editors/prevyu/PrevyuUploadModal';
import { usePrevyuMediaActions } from '../editors/prevyu/usePrevyuMediaActions';
import { useTheme } from '../theme/ThemeContext';
import type { LineItemFileRef } from '../types';
import { ProductionPhotoLightbox } from './ProductionPhotoLightbox';

const THUMB_SIZE = 56;

export const ProductionPhotos = ({
  itemId,
  itemName,
  files,
}: {
  itemId: string;
  itemName?: string;
  files: LineItemFileRef[];
}) => {
  const { colors, font, radius, spacing } = useTheme();
  const actions = usePrevyuMediaActions({
    itemId,
    files,
    fieldName: 'fotoProizvodstva',
    remoteDomFallback: 'message',
  });
  const urls = resolvePrevyuFileUrls(files);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const handleDrop = (event: ReactDragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    void actions.addFromDataTransfer(event.dataTransfer);
  };

  const handlePaste = (event: ReactClipboardEvent) => {
    event.preventDefault();
    event.stopPropagation();
    void (async () => {
      const ok = await actions.addFromPasteEvent(event.clipboardData);
      if (!ok) setUploadOpen(true);
    })();
  };

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
      onDragOver={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onDrop={handleDrop}
      onPaste={handlePaste}
    >
      <div
        style={{
          fontSize: font.sizeXs,
          color: colors.textSecondary,
          fontWeight: font.weightMedium,
        }}
      >
        Фото
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.xs, alignItems: 'center' }}>
        {files.map((file, index) => {
          const url = urls[index] ?? '';
          return (
            <div key={file.fileId || index} style={{ position: 'relative' }}>
              {url ? (
                <button
                  type="button"
                  aria-label="Открыть фото"
                  onClick={() => setPhotoUrl(url)}
                  style={{
                    padding: 0,
                    border: `1px solid ${colors.border}`,
                    borderRadius: radius.sm,
                    background: colors.bgInset,
                    cursor: 'pointer',
                    lineHeight: 0,
                  }}
                >
                  <img
                    src={url}
                    alt={file.label || 'Фото для производства'}
                    draggable={false}
                    style={{
                      width: THUMB_SIZE,
                      height: THUMB_SIZE,
                      objectFit: 'cover',
                      borderRadius: radius.sm,
                      display: 'block',
                    }}
                  />
                </button>
              ) : (
                <div
                  style={{
                    width: THUMB_SIZE,
                    height: THUMB_SIZE,
                    borderRadius: radius.sm,
                    border: `1px solid ${colors.border}`,
                    background: colors.bgInset,
                  }}
                />
              )}
              <button
                type="button"
                aria-label="Удалить фото"
                disabled={actions.isPending}
                onClick={() => void actions.removeFile(file.fileId)}
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  width: 18,
                  height: 18,
                  padding: 0,
                  border: 'none',
                  borderRadius: 999,
                  background: colors.bgElevated,
                  color: colors.text,
                  cursor: 'pointer',
                  fontSize: 12,
                  lineHeight: '18px',
                }}
              >
                ×
              </button>
            </div>
          );
        })}
        <button
          type="button"
          disabled={actions.isPending || files.length >= 6}
          onClick={() => setUploadOpen(true)}
          style={{
            width: THUMB_SIZE,
            height: THUMB_SIZE,
            borderRadius: radius.sm,
            border: `1px dashed ${colors.borderStrong}`,
            background: colors.bgElevated,
            color: colors.textSecondary,
            cursor: files.length >= 6 ? 'default' : 'pointer',
            font: 'inherit',
            fontSize: 20,
          }}
        >
          +
        </button>
      </div>
      {actions.lastError ? (
        <div style={{ fontSize: font.sizeXs, color: colors.danger }}>{actions.lastError}</div>
      ) : null}
      {photoUrl ? (
        <ProductionPhotoLightbox url={photoUrl} onClose={() => setPhotoUrl(null)} />
      ) : null}
      <PrevyuUploadModal
        itemId={itemId}
        itemName={itemName}
        files={files}
        fieldName="fotoProizvodstva"
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
      />
    </div>
  );
};
