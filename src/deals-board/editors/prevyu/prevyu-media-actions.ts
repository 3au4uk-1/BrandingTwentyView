import { PREVYU_UPLOAD_MAX_FILES } from '../../api/files-field';

export const remainingPrevyuSlots = (currentCount: number): number =>
  Math.max(0, PREVYU_UPLOAD_MAX_FILES - Math.max(0, currentCount));

export const isPrevyuRemoteDomUploadError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /песочнице|обрезал файл|байты картинки/i.test(message);
};
