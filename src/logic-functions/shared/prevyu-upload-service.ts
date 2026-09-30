export type PrevyuUploadPostBody = {
  filename?: string;
  contentType?: string;
  dataBase64: string;
};

export type PrevyuFileRefLike = { fileId: string; label?: string; url?: string };

export const PREVYU_UPLOAD_MAX_FILES = 6;

const TWENTY_FILES_FIELD_URL = /\/file\/files-field\//i;

export const isTwentyFilesFieldUrl = (value: string): boolean =>
  TWENTY_FILES_FIELD_URL.test(value.trim());

const normalizeExtension = (extension: string | undefined): string => {
  const trimmed = extension?.trim() ?? '';
  if (!trimmed) return '';
  return trimmed.startsWith('.') ? trimmed : `.${trimmed}`;
};

export const toPersistablePrevyuLabel = (file: {
  fileId: string;
  label?: string;
  extension?: string;
}): string => {
  const label = file.label?.trim() ?? '';
  if (label && !/^https?:\/\//i.test(label) && !isTwentyFilesFieldUrl(label)) {
    return label;
  }
  return `${file.fileId}${normalizeExtension(file.extension)}`;
};

/**
 * Twenty FILES PATCH input is strict `{ fileId, label }` only.
 * GET/list responses also include `extension` / `url` — re-sending those → 400.
 * Signed download URLs must never be persisted as `label` — they expire (~24h).
 */
export const sanitizePrevyuFileRef = (file: unknown): PrevyuFileRefLike | null => {
  if (!file || typeof file !== 'object') return null;
  const record = file as Record<string, unknown>;
  if (typeof record.fileId !== 'string' || !record.fileId.trim()) return null;
  const rawLabel =
    typeof record.label === 'string' && record.label.trim() ? record.label.trim() : '';
  const extension =
    typeof record.extension === 'string' ? record.extension : undefined;
  return {
    fileId: record.fileId,
    label: toPersistablePrevyuLabel({
      fileId: record.fileId,
      label: rawLabel,
      extension,
    }),
  };
};

export const sanitizePrevyuFileRefs = (
  raw: unknown,
): PrevyuFileRefLike[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(sanitizePrevyuFileRef)
    .filter((file): file is PrevyuFileRefLike => file !== null);
};

export const parsePrevyuFileRefForDisplay = (file: unknown): PrevyuFileRefLike | null => {
  const sanitized = sanitizePrevyuFileRef(file);
  if (!sanitized) return null;
  const record = file as Record<string, unknown>;
  const url =
    typeof record.url === 'string' && record.url.trim() ? record.url.trim() : undefined;
  return url ? { ...sanitized, url } : sanitized;
};

export const parsePrevyuFileRefsForDisplay = (raw: unknown): PrevyuFileRefLike[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(parsePrevyuFileRefForDisplay)
    .filter((file): file is PrevyuFileRefLike => file !== null);
};

export const PREVYU_FILE_FIELDS = ['prevyuOkleyki', 'fotoProizvodstva'] as const;

export type PrevyuFileFieldName = (typeof PREVYU_FILE_FIELDS)[number];

/** Missing field keeps the okleyka preview upload. Any other name is rejected. */
export const readUploadFieldName = (
  body: unknown,
): PrevyuFileFieldName | { error: string } => {
  if (!body || typeof body !== 'object') return 'prevyuOkleyki';
  const field = (body as { field?: unknown }).field;
  if (field == null || field === '') return 'prevyuOkleyki';
  if (field === 'prevyuOkleyki' || field === 'fotoProizvodstva') return field;
  return { error: 'Unknown file field' };
};

export const parsePrevyuUploadBody = (
  body: unknown,
): PrevyuUploadPostBody | { error: string } => {
  if (!body || typeof body !== 'object') {
    return { error: 'Missing dataBase64' };
  }
  const record = body as Record<string, unknown>;
  if (typeof record.dataBase64 !== 'string' || !record.dataBase64.trim()) {
    return { error: 'Missing dataBase64' };
  }
  return {
    dataBase64: record.dataBase64,
    filename: typeof record.filename === 'string' ? record.filename : undefined,
    contentType: typeof record.contentType === 'string' ? record.contentType : undefined,
  };
};

export const isAllowedPrevyuContentType = (contentType: string, filename: string): boolean => {
  if (contentType.startsWith('image/')) return true;
  return /\.(png|jpe?g|gif|webp|bmp|heic)$/i.test(filename);
};

export const decodePrevyuUploadBytes = (
  body: PrevyuUploadPostBody,
): { buffer: Buffer; filename: string; contentType: string } | { error: string } => {
  const filename = body.filename?.trim() || `prevyu-${Date.now()}.png`;
  const contentType = body.contentType?.trim() || 'image/png';
  if (!isAllowedPrevyuContentType(contentType, filename)) {
    return { error: 'Only image uploads are allowed' };
  }

  const raw = body.dataBase64.includes(',')
    ? body.dataBase64.slice(body.dataBase64.indexOf(',') + 1)
    : body.dataBase64;

  try {
    const buffer = Buffer.from(raw, 'base64');
    if (!buffer.byteLength) {
      return { error: 'Empty image payload' };
    }
    return { buffer, filename, contentType };
  } catch {
    return { error: 'Invalid base64 payload' };
  }
};

export const buildNextPrevyuFiles = (
  current: PrevyuFileRefLike[] | null | undefined,
  uploaded: { id: string; url?: string },
  filename: string,
): PrevyuFileRefLike[] => {
  const next = sanitizePrevyuFileRefs(current);
  if (next.length >= PREVYU_UPLOAD_MAX_FILES) {
    return next.slice(0, PREVYU_UPLOAD_MAX_FILES);
  }
  next.push({
    fileId: uploaded.id,
    label: filename,
  });
  return next.slice(0, PREVYU_UPLOAD_MAX_FILES);
};
