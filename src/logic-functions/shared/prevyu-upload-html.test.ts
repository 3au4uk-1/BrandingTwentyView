import { describe, expect, it } from 'vitest';

import { buildPrevyuUploadHtml } from './prevyu-upload-html';

describe('buildPrevyuUploadHtml', () => {
  it('embeds line item id, post URL, token and paste instructions', () => {
    const html = buildPrevyuUploadHtml({
      lineItemId: 'li-1',
      lineItemName: 'Фотобудка',
      files: [],
      postUrl: 'https://t.test/s/prevyu-upload/li-1',
      accessToken: 'tok-abc',
    });
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('li-1');
    expect(html).toContain('Ctrl+V');
    expect(html).toContain('Фотобудка');
    expect(html).toContain('prevyu-upload');
    expect(html).toContain('https://t.test/s/prevyu-upload/li-1');
    expect(html).toContain('tok-abc');
    expect(html).toContain('Authorization');
    expect(html).toContain('pasteCatch');
    expect(html).toContain('contenteditable');
    expect(html).toContain('uploadMode');
  });

  it('uses auto upload mode with bridge hook for board modal', () => {
    const html = buildPrevyuUploadHtml({
      lineItemId: 'li-1',
      lineItemName: 'X',
      files: [],
      postUrl: 'https://t.test/s/prevyu-upload/li-1',
      accessToken: 'tok',
      uploadMode: 'auto',
    });
    expect(html).toContain('"auto"');
    expect(html).toContain('__prevyuUpload');
    expect(html).toContain('NO_BRIDGE');
  });

  it('renders thumbs from file.url, not a signed URL stored in label', () => {
    const html = buildPrevyuUploadHtml({
      lineItemId: 'li-1',
      lineItemName: 'X',
      files: [
        {
          fileId: 'f1',
          label: 'https://twenty.example/file/files-field/f1?token=old',
          url: 'https://twenty.example/file/files-field/f1?token=fresh',
        },
      ],
      postUrl: 'https://t.test/s/prevyu-upload/li-1',
      accessToken: 'tok',
    });
    expect(html).toContain('file.url');
    expect(html).toContain('files-field');
  });
});
