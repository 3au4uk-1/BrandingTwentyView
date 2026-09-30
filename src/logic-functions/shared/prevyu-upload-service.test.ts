import { describe, expect, it } from 'vitest';

import {
  buildNextPrevyuFiles,
  decodePrevyuUploadBytes,
  isAllowedPrevyuContentType,
  isTwentyFilesFieldUrl,
  parsePrevyuFileRefsForDisplay,
  parsePrevyuUploadBody,
  readUploadFieldName,
  sanitizePrevyuFileRef,
  sanitizePrevyuFileRefs,
  toPersistablePrevyuLabel,
} from './prevyu-upload-service';

describe('readUploadFieldName', () => {
  it('keeps okleyka photos unless the body names production', () => {
    expect(readUploadFieldName({})).toBe('prevyuOkleyki');
    expect(readUploadFieldName({ field: 'fotoProizvodstva' })).toBe('fotoProizvodstva');
    expect(readUploadFieldName({ field: 'other' })).toEqual({ error: 'Unknown file field' });
  });
});

describe('parsePrevyuUploadBody', () => {
  it('accepts dataBase64', () => {
    expect(parsePrevyuUploadBody({ dataBase64: 'YWJj', filename: 'a.png' })).toEqual({
      dataBase64: 'YWJj',
      filename: 'a.png',
      contentType: undefined,
    });
  });

  it('rejects missing data', () => {
    expect(parsePrevyuUploadBody({})).toEqual({ error: 'Missing dataBase64' });
  });
});

describe('decodePrevyuUploadBytes', () => {
  it('decodes base64 to buffer', () => {
    const result = decodePrevyuUploadBytes({
      dataBase64: Buffer.from([1, 2, 3]).toString('base64'),
      filename: 'x.png',
      contentType: 'image/png',
    });
    expect('buffer' in result && result.buffer.equals(Buffer.from([1, 2, 3]))).toBe(true);
  });
});

describe('isAllowedPrevyuContentType', () => {
  it('allows images', () => {
    expect(isAllowedPrevyuContentType('image/png', 'a.png')).toBe(true);
    expect(isAllowedPrevyuContentType('text/plain', 'a.txt')).toBe(false);
  });
});

describe('sanitizePrevyuFileRefs', () => {
  it('strips extension/url so PATCH payload stays strict', () => {
    expect(
      sanitizePrevyuFileRefs([
        {
          fileId: '803855ed-6f13-4124-a872-adb519883491',
          label: 'shot.png',
          extension: '.png',
          url: 'https://example/file',
        },
      ]),
    ).toEqual([{ fileId: '803855ed-6f13-4124-a872-adb519883491', label: 'shot.png' }]);
  });

  it('defaults missing label to fileId', () => {
    expect(sanitizePrevyuFileRef({ fileId: 'f1' })).toEqual({ fileId: 'f1', label: 'f1' });
  });

  it('rewrites signed Twenty file URLs in label to a persistable name', () => {
    expect(
      sanitizePrevyuFileRef({
        fileId: '085cb038-b76f-4abb-bbcc-07679b299827',
        label:
          'https://twenty.dosugmayak.ru/file/files-field/085cb038-b76f-4abb-bbcc-07679b299827?token=expired',
        extension: '.png',
      }),
    ).toEqual({
      fileId: '085cb038-b76f-4abb-bbcc-07679b299827',
      label: '085cb038-b76f-4abb-bbcc-07679b299827.png',
    });
  });
});

describe('toPersistablePrevyuLabel / isTwentyFilesFieldUrl', () => {
  it('detects Twenty signed files-field URLs', () => {
    expect(
      isTwentyFilesFieldUrl(
        'https://twenty.dosugmayak.ru/file/files-field/085cb038-b76f-4abb-bbcc-07679b299827?token=abc',
      ),
    ).toBe(true);
    expect(isTwentyFilesFieldUrl('shot.png')).toBe(false);
    expect(isTwentyFilesFieldUrl('https://disk.example/a.jpg')).toBe(false);
  });

  it('keeps ordinary filenames and rewrites signed URLs', () => {
    expect(
      toPersistablePrevyuLabel({ fileId: 'f1', label: 'shot.png' }),
    ).toBe('shot.png');
    expect(
      toPersistablePrevyuLabel({
        fileId: 'f1',
        label: 'https://twenty.example/file/files-field/f1?token=x',
        extension: '.jpg',
      }),
    ).toBe('f1.jpg');
  });
});

describe('parsePrevyuFileRefsForDisplay', () => {
  it('keeps the fresh GET url and persistable label', () => {
    expect(
      parsePrevyuFileRefsForDisplay([
        {
          fileId: 'f1',
          label: 'https://twenty.example/file/files-field/f1?token=old',
          extension: '.png',
          url: 'https://twenty.example/file/files-field/f1?token=fresh',
        },
      ]),
    ).toEqual([
      {
        fileId: 'f1',
        label: 'f1.png',
        url: 'https://twenty.example/file/files-field/f1?token=fresh',
      },
    ]);
  });
});

describe('buildNextPrevyuFiles', () => {
  it('appends uploaded file ref with filename label, not signed url', () => {
    expect(
      buildNextPrevyuFiles([], { id: 'f1', url: 'https://cdn/x.png' }, 'shot.png'),
    ).toEqual([{ fileId: 'f1', label: 'shot.png' }]);
  });

  it('sanitizes existing GET-shaped refs before append', () => {
    expect(
      buildNextPrevyuFiles(
        [
          {
            fileId: 'f1',
            label: 'a.png',
            extension: '.png',
            url: 'https://cdn/a.png',
          } as { fileId: string; label: string },
        ],
        { id: 'f2', url: 'https://cdn/b.png' },
        'b.png',
      ),
    ).toEqual([
      { fileId: 'f1', label: 'a.png' },
      { fileId: 'f2', label: 'b.png' },
    ]);
  });
});
