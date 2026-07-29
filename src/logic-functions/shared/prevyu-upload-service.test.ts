import { describe, expect, it } from 'vitest';

import {
  buildNextPrevyuFiles,
  decodePrevyuUploadBytes,
  isAllowedPrevyuContentType,
  parsePrevyuUploadBody,
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

describe('buildNextPrevyuFiles', () => {
  it('appends uploaded file ref with url label', () => {
    expect(
      buildNextPrevyuFiles([], { id: 'f1', url: 'https://cdn/x.png' }, 'shot.png'),
    ).toEqual([{ fileId: 'f1', label: 'https://cdn/x.png' }]);
  });
});
