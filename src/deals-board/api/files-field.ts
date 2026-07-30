import { MetadataApiClient } from 'twenty-client-sdk/metadata';

import { DEAL_LINE_ITEM_PREVYU_OKLEYKI_FIELD_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { sanitizePrevyuFileRefs } from 'src/logic-functions/shared/prevyu-upload-service';

import type { LineItemFileRef } from '../types';

let metadataClient: MetadataApiClient | null = null;

const getMetadataApiClient = (): MetadataApiClient => {
  if (!metadataClient) metadataClient = new MetadataApiClient();
  return metadataClient;
};

export const PREVYU_UPLOAD_MAX_FILES = 6;

export const mergePrevyuFiles = (
  current: LineItemFileRef[] | null | undefined,
  next: LineItemFileRef,
): LineItemFileRef[] =>
  sanitizePrevyuFileRefs([...(current ?? []), next]).slice(0, PREVYU_UPLOAD_MAX_FILES);

export const mergePrevyuFileList = (
  current: LineItemFileRef[] | null | undefined,
  next: LineItemFileRef[],
): LineItemFileRef[] =>
  sanitizePrevyuFileRefs([...(current ?? []), ...next]).slice(0, PREVYU_UPLOAD_MAX_FILES);

export const removePrevyuFile = (
  current: LineItemFileRef[] | null | undefined,
  fileId: string,
): LineItemFileRef[] =>
  sanitizePrevyuFileRefs(current).filter((file) => file.fileId !== fileId);

export const movePrevyuFileToFront = (
  current: LineItemFileRef[] | null | undefined,
  fileId: string,
): LineItemFileRef[] => {
  const files = sanitizePrevyuFileRefs(current);
  const index = files.findIndex((file) => file.fileId === fileId);
  if (index <= 0) return files;
  const [picked] = files.splice(index, 1);
  return [picked, ...files];
};

/**
 * Resolve copy/preview URLs for FILES refs.
 * - Prefer `label` when it is an absolute http(s) URL (upload response url stored as label)
 * - Else build a workspace file download hint from fileId
 */
export const resolvePrevyuFileUrls = (
  files: LineItemFileRef[] | null | undefined,
): string[] => {
  if (!files?.length) return [];

  const origin =
    typeof globalThis !== 'undefined' &&
    'location' in globalThis &&
    typeof (globalThis as { location?: { origin?: string } }).location?.origin === 'string'
      ? (globalThis as { location: { origin: string } }).location.origin
      : '';

  return files
    .map((file) => {
      const label = file.label?.trim() ?? '';
      if (/^https?:\/\//i.test(label)) return label;
      if (!file.fileId) return '';
      if (!origin) return file.fileId;
      return `${origin}/files/${file.fileId}`;
    })
    .filter(Boolean);
};

export const isImageFile = (file: File): boolean => {
  if (typeof file.type === 'string' && file.type.startsWith('image/')) return true;
  if (typeof file.name === 'string' && /\.(png|jpe?g|gif|webp|bmp|heic)$/i.test(file.name)) {
    return true;
  }
  if (!file.type && file.size > 0) return true;
  return false;
};

export const collectImageFiles = (fileList: FileList | File[] | null | undefined): File[] => {
  if (!fileList) return [];
  const length = fileList.length;
  const out: File[] = [];
  for (let index = 0; index < length; index += 1) {
    const file = fileList[index];
    if (file && isImageFile(file)) out.push(file);
  }
  return out;
};

export const collectImageFilesFromDataTransfer = (
  dataTransfer: DataTransfer | null | undefined,
): File[] => {
  if (!dataTransfer) return [];
  const fromFiles = collectImageFiles(dataTransfer.files);
  if (fromFiles.length) return fromFiles;

  const fromItems: File[] = [];
  const items = dataTransfer.items;
  if (!items) return fromItems;
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (!item || item.kind !== 'file') continue;
    const type = typeof item.type === 'string' ? item.type : '';
    if (type && !type.startsWith('image/') && type !== 'application/octet-stream') {
      continue;
    }
    const file = item.getAsFile?.() ?? null;
    if (file && isImageFile(file)) fromItems.push(file);
  }
  return fromItems;
};

/**
 * Remote DOM paste events only forward text. `clipboard.read()` can still return
 * real image Blobs when the browser grants permission (user gesture / Ctrl+V).
 */
export const readImagesFromClipboardApi = async (): Promise<File[]> => {
  const clipboard = (
    globalThis as {
      navigator?: { clipboard?: { read?: () => Promise<ClipboardItem[]> } };
    }
  ).navigator?.clipboard;
  if (typeof clipboard?.read !== 'function') return [];

  try {
    const items = await clipboard.read();
    const files: File[] = [];
    for (const item of items) {
      const types = item.types ?? [];
      for (const type of types) {
        if (!type.startsWith('image/')) continue;
        const blob = await item.getType(type);
        const ext = type.split('/')[1]?.split(';')[0] || 'png';
        files.push(new File([blob], `clipboard.${ext}`, { type }));
      }
    }
    return files;
  } catch {
    return [];
  }
};

export type UploadedPrevyuFile = {
  fileId: string;
  path?: string;
  url?: string;
};

/** Prefer FileReader — Remote DOM host File proxies often lack `arrayBuffer()`. */
export const readBlobAsArrayBuffer = async (blob: Blob): Promise<ArrayBuffer> => {
  if (typeof blob.arrayBuffer === 'function') {
    try {
      return await blob.arrayBuffer();
    } catch {
      // fall through
    }
  }

  if (typeof Response !== 'undefined') {
    try {
      return await new Response(blob).arrayBuffer();
    } catch {
      // fall through
    }
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
        return;
      }
      reject(new Error('FileReader did not return ArrayBuffer'));
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error('FileReader failed'));
    };
    reader.readAsArrayBuffer(blob);
  });
};

export const uploadPrevyuImageFile = async (file: File): Promise<UploadedPrevyuFile> => {
  const buffer = await readBlobAsArrayBuffer(file);
  if (!buffer.byteLength) {
    throw new Error(
      'Файл пустой — в песочнице приложения байты картинки недоступны. Добавьте фото через карточку позиции.',
    );
  }
  // Remote DOM File proxies often report the real size but only expose a tiny
  // truncated buffer when read in the worker (observed: size 363 → 15 bytes).
  if (typeof file.size === 'number' && file.size > 0 && buffer.byteLength < file.size * 0.9) {
    throw new Error(
      'Виджет Twenty обрезал файл. Нажмите «Открыть карточку» и вставьте Ctrl+V в поле «Превью оклейки».',
    );
  }

  const result = await getMetadataApiClient().uploadFile(
    new Uint8Array(buffer),
    file.name || `prevyu-${Date.now()}.png`,
    file.type || 'image/png',
    DEAL_LINE_ITEM_PREVYU_OKLEYKI_FIELD_UNIVERSAL_IDENTIFIER,
  );

  if (!result?.id) {
    throw new Error('Upload did not return file id');
  }

  return {
    fileId: result.id,
    path: typeof result.path === 'string' ? result.path : undefined,
    url: typeof result.url === 'string' ? result.url : undefined,
  };
};

export const toPrevyuFileRef = (
  uploaded: UploadedPrevyuFile,
  fallbackLabel: string,
): LineItemFileRef => ({
  fileId: uploaded.fileId,
  label: uploaded.url || fallbackLabel,
});
