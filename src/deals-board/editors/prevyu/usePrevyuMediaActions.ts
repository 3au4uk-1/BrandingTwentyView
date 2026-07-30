import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import {
  collectImageFiles,
  collectImageFilesFromDataTransfer,
  movePrevyuFileToFront,
  readImagesFromClipboardApi,
  removePrevyuFile,
  uploadPrevyuFilesViaLogicFunction,
} from '../../api/files-field';
import { useUpdateLineItem } from '../../hooks/useLineItems';
import type { LineItemFileRef, LineItemRow } from '../../types';
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
  const queryClient = useQueryClient();
  const updateMutation = useUpdateLineItem();
  const [isUploading, setIsUploading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const clearError = useCallback(() => setLastError(null), []);

  const patchPrevyuInLineItemCaches = useCallback(
    (prevyuOkleyki: LineItemFileRef[]) => {
      for (const [queryKey, items] of queryClient.getQueriesData<LineItemRow[]>({
        queryKey: ['lineItems'],
      })) {
        if (!items?.some((item) => item.id === itemId)) continue;
        queryClient.setQueryData(
          queryKey,
          items.map((item) =>
            item.id === itemId ? { ...item, prevyuOkleyki } : item,
          ),
        );
      }
    },
    [itemId, queryClient],
  );

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
        for (const file of toUpload) {
          try {
            const next = await uploadPrevyuFilesViaLogicFunction(itemId, file);
            patchPrevyuInLineItemCaches(next);
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
      } finally {
        setIsUploading(false);
      }
    },
    [files, itemId, patchPrevyuInLineItemCaches, remoteDomFallback],
  );

  const addFromDataTransfer = useCallback(
    async (dataTransfer: DataTransfer | null | undefined) => {
      await addFiles(collectImageFilesFromDataTransfer(dataTransfer));
    },
    [addFiles],
  );

  const addFromClipboard = useCallback(async (): Promise<boolean> => {
    const images = await readImagesFromClipboardApi();
    if (!images.length) {
      setLastError(
        'Буфер не отдал изображение в Remote DOM — откройте окно загрузки и нажмите Ctrl+V там.',
      );
      return false;
    }
    await addFiles(images);
    return true;
  }, [addFiles]);

  const addFromPasteEvent = useCallback(
    async (clipboardData: DataTransfer | null | undefined): Promise<boolean> => {
      const fromEvent = collectImageFilesFromDataTransfer(clipboardData);
      if (fromEvent.length) {
        await addFiles(fromEvent);
        return true;
      }
      return addFromClipboard();
    },
    [addFiles, addFromClipboard],
  );

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
    addFromPasteEvent,
    makeFirst,
    removeFile,
  };
};
