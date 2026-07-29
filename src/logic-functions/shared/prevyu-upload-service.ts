export type PrevyuUploadPostBody = {
  filename?: string;
  contentType?: string;
  dataBase64: string;
};

export type PrevyuFileRefLike = { fileId: string; label?: string };

export const PREVYU_UPLOAD_MAX_FILES = 6;

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
  const next = [...(current ?? [])];
  if (next.length >= PREVYU_UPLOAD_MAX_FILES) {
    return next.slice(0, PREVYU_UPLOAD_MAX_FILES);
  }
  next.push({
    fileId: uploaded.id,
    label: uploaded.url || filename,
  });
  return next.slice(0, PREVYU_UPLOAD_MAX_FILES);
};
