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
};

export const usePrevyuMediaActions = ({ itemId, files }: UsePrevyuMediaActionsArgs) => {
  const updateMutation = useUpdateLineItem();
  const [isUploading, setIsUploading] = useState(false);

  const addFiles = useCallback(
    async (incoming: File[]) => {
      const images = collectImageFiles(incoming);
      if (!images.length) return;

      const slots = remainingPrevyuSlots((files ?? []).length);
      if (slots === 0) {
        window.alert('Максимум 6 файлов');
        return;
      }

      const toUpload = images.slice(0, slots);
      if (!toUpload.length) return;

      setIsUploading(true);
      try {
        let next = files ?? [];

        for (const file of toUpload) {
          try {
            const uploaded = await uploadPrevyuImageFile(file);
            next = mergePrevyuFileList(next, [
              toPrevyuFileRef(uploaded, file.name || 'prevyu'),
            ]);
          } catch (error) {
            if (isPrevyuRemoteDomUploadError(error)) {
              openRecordSidePanel('dealLineItem', itemId);
              return;
            }
            window.alert(
              `Не удалось загрузить превью.${error instanceof Error ? ` ${error.message}` : ''}`,
            );
            return;
          }
        }

        try {
          await updateMutation.mutateAsync({
            id: itemId,
            data: { prevyuOkleyki: next },
          });
        } catch (error) {
          window.alert(
            `Не удалось сохранить превью.${error instanceof Error ? ` ${error.message}` : ''}`,
          );
        }
      } finally {
        setIsUploading(false);
      }
    },
    [files, itemId, updateMutation],
  );

  const addFromDataTransfer = useCallback(
    async (dataTransfer: DataTransfer | null | undefined) => {
      await addFiles(collectImageFilesFromDataTransfer(dataTransfer));
    },
    [addFiles],
  );

  const addFromClipboard = useCallback(async () => {
    const images = await readImagesFromClipboardApi();
    if (!images.length) return;
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
    addFiles,
    addFromDataTransfer,
    addFromClipboard,
    makeFirst,
    removeFile,
  };
};
