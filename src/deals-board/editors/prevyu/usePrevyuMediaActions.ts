import { useCallback, useState } from 'react';

import {
  collectImageFiles,
  collectImageFilesFromDataTransfer,
  mergePrevyuFileList,
  movePrevyuFileToFront,
  readImagesFromClipboardApi,
  removePrevyuFile,
  toPrevyuFileRef,
  uploadPrevyuImageFile,
} from '../../api/files-field';
import { useUpdateLineItem } from '../../hooks/useLineItems';
import type { LineItemFileRef } from '../../types';
import { openRecordSidePanel } from '../../utils/open-record-side-panel';
import {
  isPrevyuRemoteDomUploadError,
  remainingPrevyuSlots,
} from './prevyu-media-actions';

type UsePrevyuMediaActionsArgs = {
  itemId: string;
  files: LineItemFileRef[] | null | undefined;
  /** side-panel = open card on truncated bytes; message = keep UI and set lastError */
  remoteDomFallback?: 'side-panel' | 'message';
};

export const usePrevyuMediaActions = ({
  itemId,
  files,
  remoteDomFallback = 'side-panel',
}: UsePrevyuMediaActionsArgs) => {
  const updateMutation = useUpdateLineItem();
  const [isUploading, setIsUploading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const clearError = useCallback(() => setLastError(null), []);

  const addFiles = useCallback(
    async (incoming: File[]) => {
      const images = collectImageFiles(incoming);
      if (!images.length) {
        setLastError('Не найдено изображение для загрузки.');
        return;
      }

      const slots = remainingPrevyuSlots((files ?? []).length);
      if (slots === 0) {
        const message = 'Максимум 6 файлов';
        setLastError(message);
        window.alert(message);
        return;
      }

      const toUpload = images.slice(0, slots);
      if (!toUpload.length) return;

      setIsUploading(true);
      setLastError(null);
      try {
        let next = files ?? [];

        for (const file of toUpload) {
          try {
            const uploaded = await uploadPrevyuImageFile(file);
            next = mergePrevyuFileList(next, [
              toPrevyuFileRef(uploaded, file.name || 'prevyu'),
            ]);
          } catch (error) {
            const message =
              error instanceof Error ? error.message : 'Не удалось загрузить превью.';
            if (isPrevyuRemoteDomUploadError(error)) {
              setLastError(message);
              if (remoteDomFallback === 'side-panel') {
                openRecordSidePanel('dealLineItem', itemId);
              }
              return;
            }
            setLastError(message);
            window.alert(`Не удалось загрузить превью.${message ? ` ${message}` : ''}`);
            return;
          }
        }

        try {
          await updateMutation.mutateAsync({
            id: itemId,
            data: { prevyuOkleyki: next },
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Не удалось сохранить превью.';
          setLastError(message);
          window.alert(`Не удалось сохранить превью.${message ? ` ${message}` : ''}`);
        }
      } finally {
        setIsUploading(false);
      }
    },
    [files, itemId, remoteDomFallback, updateMutation],
  );

  const addFromDataTransfer = useCallback(
    async (dataTransfer: DataTransfer | null | undefined) => {
      await addFiles(collectImageFilesFromDataTransfer(dataTransfer));
    },
    [addFiles],
  );

  const addFromClipboard = useCallback(async () => {
    const images = await readImagesFromClipboardApi();
    if (!images.length) {
      setLastError(
        'Буфер не отдал изображение. В Remote DOM Ctrl+V часто не передаёт картинку — попробуйте выбрать файл или «Открыть в карточке».',
      );
      return;
    }
    await addFiles(images);
  }, [addFiles]);

  const makeFirst = useCallback(
    async (fileId: string) => {
      try {
        await updateMutation.mutateAsync({
          id: itemId,
          data: { prevyuOkleyki: movePrevyuFileToFront(files, fileId) },
        });
      } catch (error) {
        window.alert(
          `Не удалось изменить порядок превью.${error instanceof Error ? ` ${error.message}` : ''}`,
        );
      }
    },
    [files, itemId, updateMutation],
  );

  const removeFile = useCallback(
    async (fileId: string) => {
      try {
        await updateMutation.mutateAsync({
          id: itemId,
          data: { prevyuOkleyki: removePrevyuFile(files, fileId) },
        });
      } catch (error) {
        window.alert(
          `Не удалось удалить превью.${error instanceof Error ? ` ${error.message}` : ''}`,
        );
      }
    },
    [files, itemId, updateMutation],
  );

  return {
    isPending: isUploading || updateMutation.isPending,
    lastError,
    clearError,
    addFiles,
    addFromDataTransfer,
    addFromClipboard,
    makeFirst,
    removeFile,
  };
};
