import { describe, expect, it } from 'vitest';

import {
  buildNextPrevyuFiles,
  decodePrevyuUploadBytes,
  isAllowedPrevyuContentType,
  parsePrevyuUploadBody,
  sanitizePrevyuFileRef,
  sanitizePrevyuFileRefs,
} from './prevyu-upload-service';

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
});

describe('buildNextPrevyuFiles', () => {
  it('appends uploaded file ref with url label', () => {
    expect(
      buildNextPrevyuFiles([], { id: 'f1', url: 'https://cdn/x.png' }, 'shot.png'),
    ).toEqual([{ fileId: 'f1', label: 'https://cdn/x.png' }]);
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
      { fileId: 'f2', label: 'https://cdn/b.png' },
    ]);
  });
});
