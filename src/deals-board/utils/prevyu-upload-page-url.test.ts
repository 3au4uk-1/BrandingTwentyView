import { describe, expect, it } from 'vitest';

import { buildPrevyuUploadPageUrl } from './prevyu-upload-page-url';

describe('buildPrevyuUploadPageUrl', () => {
  it('joins base and path', () => {
    expect(buildPrevyuUploadPageUrl('https://t.test/functions', 'abc')).toBe(
      'https://t.test/functions/prevyu-upload/abc',
    );
    expect(buildPrevyuUploadPageUrl('https://t.test/functions/', 'abc')).toBe(
      'https://t.test/functions/prevyu-upload/abc',
    );
  });
});
